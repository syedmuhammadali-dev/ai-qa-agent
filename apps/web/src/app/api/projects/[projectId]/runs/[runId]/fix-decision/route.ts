import { NextRequest, NextResponse } from "next/server";
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
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: 'decision must be "approved" or "rejected"' }, { status: 400 });
  }

  const runRef = getAdminDb().collection("projects").doc(projectId).collection("runs").doc(runId);
  const runSnap = await runRef.get();
  if (!runSnap.exists) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  const fix = runSnap.data()?.fix;
  if (!fix) return NextResponse.json({ error: "This run has no proposed fix" }, { status: 400 });
  if (fix.status !== "proposed") {
    return NextResponse.json({ error: `Fix is already ${fix.status}` }, { status: 400 });
  }
  if (decision === "approved" && fix.safety === "DANGEROUS") {
    return NextResponse.json(
      { error: "Fixes classified DANGEROUS can never be approved through this pipeline." },
      { status: 403 }
    );
  }

  await runRef.update({ "fix.status": decision, "fix.decidedAt": Date.now(), "fix.decidedByUid": auth.uid });
  return NextResponse.json({ ok: true });
}
