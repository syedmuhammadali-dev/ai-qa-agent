import { NextRequest, NextResponse } from "next/server";
import { isProtectedBranch, type ReleasePlan } from "@ai-qa-agent/agent-core";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { requireOwnedProject } from "@/lib/projects/server";
import { getGitHubClientForUser } from "@/lib/github/server";
import { parseGithubRepoUrl } from "@/lib/github/parse-url";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

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
  const fix = run.fix;
  if (!fix || fix.status !== "applied") {
    return NextResponse.json(
      { error: "A release can only be planned for a fix that was applied and passed regression." },
      { status: 400 }
    );
  }
  if (run.release && run.release.status !== "rejected" && run.release.status !== "failed") {
    return NextResponse.json({ error: `A release is already ${run.release.status} for this run` }, { status: 400 });
  }

  const projectSnap = await getAdminDb().collection("projects").doc(projectId).get();
  const project = projectSnap.data()!;
  const githubRepoUrl = project.githubRepoUrl as string | undefined;
  if (!githubRepoUrl) {
    return NextResponse.json({ error: "Connect a GitHub repository first (Settings)" }, { status: 400 });
  }
  const repoRef = parseGithubRepoUrl(githubRepoUrl);
  if (!repoRef) return NextResponse.json({ error: "Could not parse the GitHub repository URL" }, { status: 400 });

  const client = await getGitHubClientForUser(auth.uid);
  if (!client) return NextResponse.json({ error: "GitHub is not connected" }, { status: 409 });

  const repo = await client.getRepo(repoRef.owner, repoRef.repo).catch(() => null);
  if (!repo) return NextResponse.json({ error: "Could not read the repository from GitHub" }, { status: 502 });

  const branchName = `ai-qa-agent/${slugify(fix.filePath)}-${Date.now()}`;
  if (isProtectedBranch(branchName)) {
    // Unreachable in practice (the generated name is never bare main/master),
    // but this is the same guard the local agent re-checks before running git.
    return NextResponse.json({ error: "Refusing to target a protected branch" }, { status: 400 });
  }

  const testsSummary =
    typeof fix.regressionExitCode === "number"
      ? `Regression suite ran and exited ${fix.regressionExitCode} (passed).`
      : "No test framework was detected — regression was not run.";

  const release: ReleasePlan = {
    branchName,
    baseBranch: repo.defaultBranch,
    commitMessage: `fix: ${fix.filePath} — ${fix.explanation}`.slice(0, 200),
    changedFiles: [fix.filePath],
    testsSummary,
    findingsSummary: `Fixes a real failure from run \`${run.command}\` (exit ${run.exitCode}).`,
    aiExplanation: fix.explanation,
    status: "pending",
    createdAt: Date.now(),
  };

  await runRef.update({ release });
  return NextResponse.json({ release });
}
