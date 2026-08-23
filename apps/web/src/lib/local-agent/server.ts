import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifySessionToken, type SessionPayload } from "@/lib/local-agent/tokens";

export async function requireLocalAgentSession(
  req: NextRequest
): Promise<SessionPayload | { error: NextResponse }> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  let payload: SessionPayload;
  try {
    payload = verifySessionToken(token);
  } catch {
    return { error: NextResponse.json({ error: "Invalid session token" }, { status: 401 }) };
  }

  const sessionRef = getAdminDb()
    .collection("projects")
    .doc(payload.projectId)
    .collection("private")
    .doc("local-agent")
    .collection("sessions")
    .doc(payload.sessionId);

  const snap = await sessionRef.get();
  if (!snap.exists || snap.data()?.revoked) {
    return { error: NextResponse.json({ error: "Session revoked" }, { status: 401 }) };
  }

  await sessionRef.update({ lastSeenAt: Date.now() }).catch(() => {});

  return payload;
}
