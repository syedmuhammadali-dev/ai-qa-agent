import { NextRequest, NextResponse } from "next/server";
import { analyzeProject } from "@ai-qa-agent/project-analyzer";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { requireOwnedProject } from "@/lib/projects/server";
import { getGitHubClientForUser, handleGitHubError } from "@/lib/github/server";
import { parseGithubRepoUrl } from "@/lib/github/parse-url";
import { createGithubFileProvider } from "@/lib/github/github-file-provider";

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
  }
  const { projectId } = await params;
  const auth = await requireOwnedProject(req, projectId);
  if (auth.error) return auth.error;

  const projectSnap = await getAdminDb().collection("projects").doc(projectId).get();
  const githubRepoUrl = projectSnap.data()?.githubRepoUrl as string | undefined;
  if (!githubRepoUrl) {
    return NextResponse.json({ error: "This project has no GitHub repository connected yet" }, { status: 400 });
  }
  const repoRef = parseGithubRepoUrl(githubRepoUrl);
  if (!repoRef) {
    return NextResponse.json({ error: "Could not parse the GitHub repository URL" }, { status: 400 });
  }

  const client = await getGitHubClientForUser(auth.uid);
  if (!client) return NextResponse.json({ error: "GitHub is not connected" }, { status: 409 });

  try {
    const repo = await client.getRepo(repoRef.owner, repoRef.repo);
    const provider = createGithubFileProvider(client, repoRef.owner, repoRef.repo, repo.defaultBranch);
    const analysis = await analyzeProject(provider);
    return NextResponse.json({ analysis, ref: repo.defaultBranch });
  } catch (err) {
    return handleGitHubError(err);
  }
}
