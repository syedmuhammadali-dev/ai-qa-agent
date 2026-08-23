import { NextRequest, NextResponse } from "next/server";
import { previewOutput } from "@ai-qa-agent/agent-core";
import type { PermissionMode, PolicyDecision, RiskLevel } from "@ai-qa-agent/command-policy";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { requireLocalAgentSession } from "@/lib/local-agent/server";

const RISK_LEVELS: RiskLevel[] = ["read", "low", "medium", "high", "critical", "blocked"];
const DECISIONS: PolicyDecision[] = ["auto_allow", "requires_approval", "blocked"];
const MODES: PermissionMode[] = ["manual", "auto_safe", "auto_fix"];

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
    return NextResponse.json({ error: "Invalid audit payload" }, { status: 400 });
  }
  if (!RISK_LEVELS.includes(body.risk)) {
    return NextResponse.json({ error: "Invalid risk level" }, { status: 400 });
  }
  if (!DECISIONS.includes(body.decision)) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }
  if (!MODES.includes(body.permissionMode)) {
    return NextResponse.json({ error: "Invalid permission mode" }, { status: 400 });
  }

  const record = {
    command: String(body.command).slice(0, 2000),
    reason: String(body.reason ?? "").slice(0, 500),
    risk: body.risk as RiskLevel,
    category: String(body.category ?? "unknown").slice(0, 100),
    decision: body.decision as PolicyDecision,
    permissionMode: body.permissionMode as PermissionMode,
    approved: Boolean(body.approved),
    editedFromCommand:
      typeof body.editedFromCommand === "string" ? body.editedFromCommand.slice(0, 2000) : null,
    exitCode: typeof body.exitCode === "number" ? body.exitCode : null,
    durationMs: typeof body.durationMs === "number" ? body.durationMs : 0,
    outputHash: typeof body.outputHash === "string" ? body.outputHash.slice(0, 128) : "",
    // Defense in depth: re-redact/truncate server-side even though the agent already does this.
    stdoutPreview: previewOutput(String(body.stdoutPreview ?? "")),
    stderrPreview: previewOutput(String(body.stderrPreview ?? "")),
    runId: typeof body.runId === "string" ? body.runId.slice(0, 200) : null,
    uid: session.uid,
    sessionId: session.sessionId,
    createdAt: Date.now(),
  };

  const ref = await getAdminDb().collection("projects").doc(projectId).collection("commands").add(record);
  return NextResponse.json({ id: ref.id });
}
