import { NextRequest, NextResponse } from "next/server";
import { isProtectedBranch } from "@ai-qa-agent/agent-core";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { requireOwnedProject } from "@/lib/projects/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; runId: string }> }
) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
  }
  const { projectId, runId } = await params;
  const auth = await requireOwnedProject(req, projectId);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const decision = body?.decision;
  if (decision !== "confirmed" && decision !== "rejected") {
    return NextResponse.json({ error: 'decision must be "confirmed" or "rejected"' }, { status: 400 });
  }

  const runRef = getAdminDb().collection("projects").doc(projectId).collection("runs").doc(runId);
  const runSnap = await runRef.get();
  if (!runSnap.exists) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  const release = runSnap.data()?.release;
  if (!release) return NextResponse.json({ error: "This run has no release plan" }, { status: 400 });
  if (release.status !== "pending") {
    return NextResponse.json({ error: `Release is already ${release.status}` }, { status: 400 });
  }
  if (decision === "confirmed" && isProtectedBranch(release.branchName)) {
    return NextResponse.json({ error: "Refusing to confirm a release targeting a protected branch" }, { status: 403 });
  }

  await runRef.update({
    "release.status": decision,
    "release.decidedAt": Date.now(),
    "release.decidedByUid": auth.uid,
  });
  return NextResponse.json({ ok: true });
}
