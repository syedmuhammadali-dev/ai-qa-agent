import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminBucket,
  getAdminDb,
  isFirebaseAdminConfigured,
  isFirebaseStorageConfigured,
} from "@/lib/firebase/admin";
import { requireLocalAgentSession } from "@/lib/local-agent/server";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB — screenshots only, not video

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured" },
      { status: 503 },
    );
  }
  const session = await requireLocalAgentSession(req);
  if ("error" in session) return session.error;

  const { projectId } = await params;
  if (session.projectId !== projectId) {
    return NextResponse.json(
      { error: "Session does not belong to this project" },
      { status: 403 },
    );
  }

  const projectSnap = await getAdminDb()
    .collection("projects")
    .doc(projectId)
    .get();
  if (!projectSnap.data()?.evidenceUploadEnabled) {
    // Local evidence is the default — this is not an error, just a no-op.
    return NextResponse.json({
      uploaded: false,
      reason: "Cloud evidence upload is not enabled for this project",
    });
  }
  if (!isFirebaseStorageConfigured) {
    return NextResponse.json(
      { error: "Firebase Storage is not configured" },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const { runId, filename, contentType, base64Content } = body ?? {};
  if (
    typeof runId !== "string" ||
    typeof filename !== "string" ||
    typeof base64Content !== "string"
  ) {
    return NextResponse.json(
      { error: "runId, filename, and base64Content are required" },
      { status: 400 },
    );
  }
  if (!/^[\w.-]+$/.test(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const buffer = Buffer.from(base64Content, "base64");
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File too large (8MB max)" },
      { status: 413 },
    );
  }

  const path = `users/${session.uid}/projects/${projectId}/evidence/${runId}/${filename}`;
  await getAdminBucket()
    .file(path)
    .save(buffer, {
      contentType:
        typeof contentType === "string"
          ? contentType
          : "application/octet-stream",
    });

  await getAdminDb()
    .collection("projects")
    .doc(projectId)
    .collection("runs")
    .doc(runId)
    .update({ evidencePaths: FieldValue.arrayUnion(path) })
    .catch(() => {
      // Best-effort — the file is safely uploaded either way, this just links it to the run for display.
    });

  return NextResponse.json({ uploaded: true, path });
}
