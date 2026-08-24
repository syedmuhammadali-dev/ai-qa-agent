import { NextRequest, NextResponse } from "next/server";
import { previewOutput } from "@ai-qa-agent/agent-core";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { requireLocalAgentSession } from "@/lib/local-agent/server";

export async function POST(
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
  if (!body || typeof body.regressionPassed !== "boolean") {
    return NextResponse.json({ error: "regressionPassed (boolean) is required" }, { status: 400 });
  }

  const runRef = getAdminDb().collection("projects").doc(projectId).collection("runs").doc(runId);
  await runRef.update({
    "fix.status": body.regressionPassed ? "applied" : "regression_failed",
    "fix.appliedAt": Date.now(),
    "fix.regressionLog": previewOutput(String(body.regressionLog ?? "")),
    "fix.regressionExitCode": typeof body.regressionExitCode === "number" ? body.regressionExitCode : null,
  });

  return NextResponse.json({ ok: true });
}
