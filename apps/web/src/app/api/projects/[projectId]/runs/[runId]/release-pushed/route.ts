import { NextRequest, NextResponse } from "next/server";
import { isProtectedBranch } from "@ai-qa-agent/agent-core";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { requireLocalAgentSession } from "@/lib/local-agent/server";
import { getGitHubClientForUser } from "@/lib/github/server";
import { parseGithubRepoUrl } from "@/lib/github/parse-url";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; runId: string }> }
) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
  }
  const session = await requireLocalAgentSession(req);
  if ("error" in session) return session.error;

  const { projectId, runId } = await params;
  if (session.projectId !== projectId) {
    return NextResponse.json({ error: "Session does not belong to this project" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.success !== "boolean") {
    return NextResponse.json({ error: "success (boolean) is required" }, { status: 400 });
  }

  const runRef = getAdminDb().collection("projects").doc(projectId).collection("runs").doc(runId);
  const runSnap = await runRef.get();
  if (!runSnap.exists) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  const release = runSnap.data()?.release;
  if (!release || release.status !== "confirmed") {
    return NextResponse.json({ error: "This run has no confirmed release awaiting push" }, { status: 400 });
  }

  if (!body.success) {
    await runRef.update({
      "release.status": "failed",
      "release.failureReason": String(body.failureReason ?? "Unknown failure").slice(0, 2000),
    });
    return NextResponse.json({ ok: true });
  }

  if (isProtectedBranch(release.branchName)) {
    // Defense in depth — should be unreachable, the branch name is validated
    // at plan-creation time and again by the local agent before it runs git.
    await runRef.update({ "release.status": "failed", "release.failureReason": "Branch name was protected" });
    return NextResponse.json({ error: "Refusing to record a push to a protected branch" }, { status: 403 });
  }

  const commitSha = typeof body.commitSha === "string" ? body.commitSha : undefined;

  const projectSnap = await getAdminDb().collection("projects").doc(projectId).get();
  const project = projectSnap.data()!;
  const repoRef = parseGithubRepoUrl(String(project.githubRepoUrl ?? ""));
  const client = repoRef ? await getGitHubClientForUser(project.ownerId) : null;

  let prUrl: string | undefined;
  if (client && repoRef) {
    const pr = await client
      .createPullRequest(
        repoRef.owner,
        repoRef.repo,
        release.baseBranch,
        release.branchName,
        release.commitMessage,
        `${release.aiExplanation}\n\n**Tests:** ${release.testsSummary}\n**Findings:** ${release.findingsSummary}\n\n_Opened automatically by AI QA Agent. Review before merging._`
      )
      .catch(() => null);
    prUrl = pr?.htmlUrl;
  }

  await runRef.update({
    "release.status": "pushed",
    "release.pushedAt": Date.now(),
    ...(commitSha ? { "release.commitSha": commitSha } : {}),
    ...(prUrl ? { "release.prUrl": prUrl } : {}),
  });
  return NextResponse.json({ ok: true, prUrl });
}
