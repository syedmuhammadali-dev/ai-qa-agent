import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { LocalAgentSession } from "@ai-qa-agent/agent-core";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { signSessionToken, verifyPairingCode } from "@/lib/local-agent/tokens";

export async function POST(req: NextRequest) {
  if (!isFirebaseAdminConfigured || !process.env.LOCAL_AGENT_SHARED_SECRET) {
    return NextResponse.json({ error: "Local agent pairing is not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const code = body?.code;
  const deviceLabel = typeof body?.deviceLabel === "string" ? body.deviceLabel.slice(0, 100) : "unknown device";
  if (typeof code !== "string") {
    return NextResponse.json({ error: "Missing pairing code" }, { status: 400 });
  }

  let pairing: { uid: string; projectId: string };
  try {
    pairing = verifyPairingCode(code);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid pairing code" },
      { status: 400 }
    );
  }

  const projectSnap = await getAdminDb().collection("projects").doc(pairing.projectId).get();
  if (!projectSnap.exists) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const sessionId = randomUUID();
  await getAdminDb()
    .collection("projects")
    .doc(pairing.projectId)
    .collection("private")
    .doc("local-agent")
    .collection("sessions")
    .doc(sessionId)
    .set({
      deviceLabel,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      revoked: false,
    });

  const sessionToken = signSessionToken({ uid: pairing.uid, projectId: pairing.projectId, sessionId });

  const response: LocalAgentSession = {
    sessionToken,
    projectId: pairing.projectId,
    projectName: (projectSnap.data()?.name as string | undefined) ?? "Untitled project",
  };
  return NextResponse.json(response);
}
