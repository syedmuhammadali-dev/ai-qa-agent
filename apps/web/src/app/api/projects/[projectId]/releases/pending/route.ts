import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { requireLocalAgentSession } from "@/lib/local-agent/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
  }
  const session = await requireLocalAgentSession(req);
  if ("error" in session) return session.error;

  const { projectId } = await params;
  if (session.projectId !== projectId) {
    return NextResponse.json({ error: "Session does not belong to this project" }, { status: 403 });
  }

  const snap = await getAdminDb()
    .collection("projects")
    .doc(projectId)
    .collection("runs")
    .where("release.status", "==", "confirmed")
    .get();

  const releases = snap.docs.map((d) => ({ runId: d.id, ...d.data().release }));
  return NextResponse.json({ releases });
}
