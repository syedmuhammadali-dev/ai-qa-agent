import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { requireLocalAgentSession } from "@/lib/local-agent/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
  }
  const session = await requireLocalAgentSession(req);
  if ("error" in session) return session.error;

  const { projectId } = await params;
  if (session.projectId !== projectId) {
    return NextResponse.json({ error: "Session does not belong to this project" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.command !== "string") {
    return NextResponse.json({ error: "Invalid run payload" }, { status: 400 });
  }

  const ref = await getAdminDb()
    .collection("projects")
    .doc(projectId)
    .collection("runs")
    .add({
      command: String(body.command).slice(0, 2000),
      category: String(body.category ?? "unknown").slice(0, 100),
      status: "running",
      startedAt: Date.now(),
      finishedAt: null,
      exitCode: null,
      log: "",
    });

  return NextResponse.json({ runId: ref.id });
}
