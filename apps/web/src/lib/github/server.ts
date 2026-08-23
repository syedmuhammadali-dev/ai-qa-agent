import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { GitHubApiError, createGitHubClient, type GitHubClient } from "@ai-qa-agent/github";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export async function requireUid(req: NextRequest): Promise<{ uid: string } | { error: NextResponse }> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const decoded = await getAdminAuth().verifyIdToken(token).catch(() => null);
  if (!decoded) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  return { uid: decoded.uid };
}

export async function getGitHubClientForUser(uid: string): Promise<GitHubClient | null> {
  const snap = await getAdminDb()
    .collection("users")
    .doc(uid)
    .collection("private")
    .doc("github")
    .get();
  if (!snap.exists) return null;
  const accessToken = snap.data()?.accessToken as string | undefined;
  if (!accessToken) return null;
  return createGitHubClient(accessToken);
}

export function handleGitHubError(err: unknown): NextResponse {
  if (err instanceof GitHubApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status === 404 ? 404 : 502 });
  }
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Unknown error" },
    { status: 500 }
  );
}
