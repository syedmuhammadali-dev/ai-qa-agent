import { NextRequest, NextResponse } from "next/server";
import { createGitHubClient, exchangeCodeForToken } from "@ai-qa-agent/github";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyState } from "@/lib/github/state";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!code || !stateParam || !clientId || !clientSecret) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?github_error=missing_params`,
    );
  }

  let state: ReturnType<typeof verifyState>;
  try {
    state = verifyState(stateParam);
  } catch {
    return NextResponse.redirect(
      `${appUrl}/dashboard?github_error=invalid_state`,
    );
  }
  if (Date.now() - state.ts > 10 * 60 * 1000) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?github_error=expired_state`,
    );
  }

  try {
    const { accessToken, scope } = await exchangeCodeForToken(
      {
        clientId,
        clientSecret,
        redirectUri: `${appUrl}/api/auth/github/callback`,
      },
      code,
    );
    const identity = await createGitHubClient(accessToken).getIdentity();

    await getAdminDb()
      .collection("users")
      .doc(state.uid)
      .collection("private")
      .doc("github")
      .set({
        accessToken,
        scope,
        login: identity.login,
        connectedAt: Date.now(),
      });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(
      `${appUrl}/dashboard?github_error=${encodeURIComponent(message)}`,
    );
  }

  const redirectPath = state.projectId
    ? `/projects/${state.projectId}/github`
    : "/dashboard";
  return NextResponse.redirect(`${appUrl}${redirectPath}?github_connected=1`);
}
