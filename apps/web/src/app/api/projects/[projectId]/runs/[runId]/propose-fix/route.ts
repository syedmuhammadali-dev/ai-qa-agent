import { NextRequest, NextResponse } from "next/server";
import {
  getAIProvider,
  parseFileTargetResponse,
  parseFixPatchResponse,
  type AIProviderConfig,
} from "@ai-qa-agent/ai";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { requireOwnedProject } from "@/lib/projects/server";
import { getGitHubClientForUser } from "@/lib/github/server";
import { parseGithubRepoUrl } from "@/lib/github/parse-url";

const FILE_TARGET_PROMPT = `You are a senior SDET. Given a failing command and its real output, identify
the SINGLE most likely source file (a real relative path from the repository root) that needs to change
to fix it. Respond with ONLY a JSON object, no markdown fence, no prose: {"filePath": "...", "reason": "..."}`;

const PATCH_PROMPT = `You are a senior SDET proposing a fix. You are given the failing command's log and
the full current content of the file most likely responsible. Produce a corrected FULL version of the
file (not a diff) that fixes the failure while changing as little else as possible.

Classify the fix:
- SAFE: test selectors, imports, config, formatting, obvious generated-test errors.
- REVIEW_REQUIRED: touches authentication, authorization, database, or business logic.
- DANGEROUS: touches production config, deployment, or destructive operations.

Respond with ONLY a JSON object, no markdown fence, no prose:
{"patchedContent": "...", "explanation": "...", "safety": "SAFE" | "REVIEW_REQUIRED" | "DANGEROUS"}`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; runId: string }> }
) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
  }
  const { projectId, runId } = await params;
  const auth = await requireOwnedProject(req, projectId);
  if (auth.error) return auth.error;

  const runRef = getAdminDb().collection("projects").doc(projectId).collection("runs").doc(runId);
  const runSnap = await runRef.get();
  if (!runSnap.exists) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  const run = runSnap.data()!;
  if (run.status !== "failed") {
    return NextResponse.json({ error: "This run did not fail — nothing to fix" }, { status: 400 });
  }

  const projectSnap = await getAdminDb().collection("projects").doc(projectId).get();
  const githubRepoUrl = projectSnap.data()?.githubRepoUrl as string | undefined;
  if (!githubRepoUrl) {
    return NextResponse.json({ error: "Connect a GitHub repository first (Settings)" }, { status: 400 });
  }
  const repoRef = parseGithubRepoUrl(githubRepoUrl);
  if (!repoRef) return NextResponse.json({ error: "Could not parse the GitHub repository URL" }, { status: 400 });

  const client = await getGitHubClientForUser(auth.uid);
  if (!client) return NextResponse.json({ error: "GitHub is not connected" }, { status: 409 });

  const configSnap = await getAdminDb()
    .collection("projects")
    .doc(projectId)
    .collection("private")
    .doc("ai-config")
    .get();
  if (!configSnap.exists) {
    return NextResponse.json({ error: "No AI provider configured for this project. Add one in Settings." }, { status: 400 });
  }
  const aiConfig = configSnap.data() as AIProviderConfig;
  const provider = getAIProvider(aiConfig.provider);

  try {
    const repo = await client.getRepo(repoRef.owner, repoRef.repo);
    const tree = await client.getTree(repoRef.owner, repoRef.repo, repo.defaultBranch);
    const knownPaths = new Set(tree.filter((e) => e.type === "blob").map((e) => e.path));

    const targetResponse = await provider.chat(aiConfig, {
      messages: [
        { role: "system", content: FILE_TARGET_PROMPT },
        { role: "user", content: `Command: ${run.command}\nExit code: ${run.exitCode}\n\nLog:\n${String(run.log ?? "").slice(-4000)}` },
      ],
      temperature: 0.1,
      maxTokens: 200,
    });
    const target = parseFileTargetResponse(targetResponse.content);
    if (!target.ok) return NextResponse.json({ error: target.error }, { status: 502 });
    if (!knownPaths.has(target.value.filePath)) {
      return NextResponse.json(
        { error: `The model pointed at "${target.value.filePath}", which doesn't exist in the repository. Refusing to guess.` },
        { status: 502 }
      );
    }

    const file = await client.getFileContent(repoRef.owner, repoRef.repo, target.value.filePath, repo.defaultBranch);
    const originalContent = file.encoding === "base64" ? Buffer.from(file.content, "base64").toString("utf8") : file.content;

    const patchResponse = await provider.chat(aiConfig, {
      messages: [
        { role: "system", content: PATCH_PROMPT },
        {
          role: "user",
          content: `Command: ${run.command}\nLog:\n${String(run.log ?? "").slice(-4000)}\n\nFile: ${target.value.filePath}\n\n${originalContent}`,
        },
      ],
      temperature: 0.1,
      maxTokens: 4000,
    });
    const patch = parseFixPatchResponse(patchResponse.content);
    if (!patch.ok) return NextResponse.json({ error: patch.error }, { status: 502 });

    const fix = {
      filePath: target.value.filePath,
      targetReason: target.value.reason,
      originalContent,
      patchedContent: patch.value.patchedContent,
      explanation: patch.value.explanation,
      safety: patch.value.safety,
      status: "proposed" as const,
      createdAt: Date.now(),
    };

    await runRef.update({ fix });
    return NextResponse.json({ fix });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fix proposal failed" }, { status: 502 });
  }
}
