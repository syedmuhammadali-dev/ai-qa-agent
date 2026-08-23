import { NextRequest, NextResponse } from "next/server";
import { getGitHubClientForUser, handleGitHubError, requireUid } from "@/lib/github/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const auth = await requireUid(req);
  if ("error" in auth) return auth.error;

  const path = req.nextUrl.searchParams.get("path");
  const ref = req.nextUrl.searchParams.get("ref");
  if (!path || !ref) {
    return NextResponse.json({ error: "path and ref query params are required" }, { status: 400 });
  }

  const client = await getGitHubClientForUser(auth.uid);
  if (!client) return NextResponse.json({ error: "GitHub is not connected" }, { status: 409 });

  const { owner, repo } = await params;
  try {
    const file = await client.getFileContent(owner, repo, path, ref);
    return NextResponse.json({ file });
  } catch (err) {
    return handleGitHubError(err);
  }
}
