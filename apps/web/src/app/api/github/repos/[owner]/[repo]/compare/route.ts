import { NextRequest, NextResponse } from "next/server";
import { getGitHubClientForUser, handleGitHubError, requireUid } from "@/lib/github/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const auth = await requireUid(req);
  if ("error" in auth) return auth.error;

  const base = req.nextUrl.searchParams.get("base");
  const head = req.nextUrl.searchParams.get("head");
  if (!base || !head) {
    return NextResponse.json({ error: "base and head query params are required" }, { status: 400 });
  }

  const client = await getGitHubClientForUser(auth.uid);
  if (!client) return NextResponse.json({ error: "GitHub is not connected" }, { status: 409 });

  const { owner, repo } = await params;
  try {
    const compare = await client.compare(owner, repo, base, head);
    return NextResponse.json({ compare });
  } catch (err) {
    return handleGitHubError(err);
  }
}
