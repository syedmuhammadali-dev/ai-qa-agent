import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@ai-qa-agent/github";
import { requireUid } from "@/lib/github/server";
import { signState } from "@/lib/github/state";

export async function GET(req: NextRequest) {
  const auth = await requireUid(req);
  if ("error" in auth) return auth.error;

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!clientId || !clientSecret || !process.env.GITHUB_OAUTH_STATE_SECRET) {
    return NextResponse.json({ error: "GitHub OAuth is not configured" }, { status: 503 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId") ?? "";
  const state = signState({ uid: auth.uid, projectId, ts: Date.now() });

  const url = buildAuthorizeUrl(
    { clientId, clientSecret, redirectUri: `${appUrl}/api/auth/github/callback` },
    state
  );
  return NextResponse.json({ url });
}
