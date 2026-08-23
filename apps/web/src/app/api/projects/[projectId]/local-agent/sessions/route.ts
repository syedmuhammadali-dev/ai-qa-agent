import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { requireOwnedProject } from "@/lib/projects/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
  }
  const { projectId } = await params;
  const auth = await requireOwnedProject(req, projectId);
  if (auth.error) return auth.error;

  const snap = await getAdminDb()
    .collection("projects")
    .doc(projectId)
    .collection("private")
    .doc("local-agent")
    .collection("sessions")
    .orderBy("createdAt", "desc")
    .get();

  const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ sessions });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
  }
  const { projectId } = await params;
  const auth = await requireOwnedProject(req, projectId);
  if (auth.error) return auth.error;

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId is required" }, { status: 400 });

  await getAdminDb()
    .collection("projects")
    .doc(projectId)
    .collection("private")
    .doc("local-agent")
    .collection("sessions")
    .doc(sessionId)
    .delete();

  return NextResponse.json({ ok: true });
}
