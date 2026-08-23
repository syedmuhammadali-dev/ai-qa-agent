import { NextRequest, NextResponse } from "next/server";
import { getGitHubClientForUser, handleGitHubError, requireUid } from "@/lib/github/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const auth = await requireUid(req);
  if ("error" in auth) return auth.error;

  const ref = req.nextUrl.searchParams.get("ref");
  if (!ref) return NextResponse.json({ error: "ref query param is required" }, { status: 400 });

  const client = await getGitHubClientForUser(auth.uid);
  if (!client) return NextResponse.json({ error: "GitHub is not connected" }, { status: 409 });

  const { owner, repo } = await params;
  try {
    const tree = await client.getTree(owner, repo, ref);
    return NextResponse.json({ tree });
  } catch (err) {
    return handleGitHubError(err);
  }
}
