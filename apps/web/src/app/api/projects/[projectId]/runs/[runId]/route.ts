import { NextRequest, NextResponse } from "next/server";
import { previewOutput, type RunStatus } from "@ai-qa-agent/agent-core";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { requireLocalAgentSession } from "@/lib/local-agent/server";

const VALID_STATUSES: RunStatus[] = ["running", "completed", "failed"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; runId: string }> }
) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
  }
  const session = await requireLocalAgentSession(req);
  if ("error" in session) return session.error;

  const { projectId, runId } = await params;
  if (session.projectId !== projectId) {
    return NextResponse.json({ error: "Session does not belong to this project" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof body.log === "string") update.log = previewOutput(body.log);
  if (typeof body.status === "string") {
    if (!VALID_STATUSES.includes(body.status as RunStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }
  if (typeof body.exitCode === "number" || body.exitCode === null) update.exitCode = body.exitCode;
  if (typeof body.finishedAt === "number") update.finishedAt = body.finishedAt;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await getAdminDb()
    .collection("projects")
    .doc(projectId)
    .collection("runs")
    .doc(runId)
    .update(update);

  return NextResponse.json({ ok: true });
}
