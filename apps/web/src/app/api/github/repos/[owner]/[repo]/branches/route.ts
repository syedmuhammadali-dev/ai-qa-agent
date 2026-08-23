import { NextRequest, NextResponse } from "next/server";
import { getGitHubClientForUser, handleGitHubError, requireUid } from "@/lib/github/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const auth = await requireUid(req);
  if ("error" in auth) return auth.error;

  const client = await getGitHubClientForUser(auth.uid);
  if (!client) return NextResponse.json({ error: "GitHub is not connected" }, { status: 409 });

  const { owner, repo } = await params;
  try {
    const branches = await client.listBranches(owner, repo);
    return NextResponse.json({ branches });
  } catch (err) {
    return handleGitHubError(err);
  }
}
