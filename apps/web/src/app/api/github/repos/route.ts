import { NextRequest, NextResponse } from "next/server";
import { getGitHubClientForUser, handleGitHubError, requireUid } from "@/lib/github/server";

export async function GET(req: NextRequest) {
  const auth = await requireUid(req);
  if ("error" in auth) return auth.error;

  const client = await getGitHubClientForUser(auth.uid);
  if (!client) return NextResponse.json({ error: "GitHub is not connected" }, { status: 409 });

  try {
    const repos = await client.listRepos();
    return NextResponse.json({ repos });
  } catch (err) {
    return handleGitHubError(err);
  }
}
