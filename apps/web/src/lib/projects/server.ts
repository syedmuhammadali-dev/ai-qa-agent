import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export async function requireOwnedProject(
  req: NextRequest,
  projectId: string
): Promise<{ uid: string; error?: undefined } | { error: NextResponse; uid?: undefined }> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const decoded = await getAdminAuth().verifyIdToken(token).catch(() => null);
  if (!decoded) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  // Every route calls this before its own logic, so an uncaught exception
  // here (a bad Admin SDK credential, a transient Firestore error) used to
  // crash the whole request with an empty, non-JSON response — the client
  // would fail trying to parse it, with no real error message anywhere.
  let projectSnap;
  try {
    projectSnap = await getAdminDb().collection("projects").doc(projectId).get();
  } catch (err) {
    console.error("requireOwnedProject: failed to read project", projectId, err);
    return {
      error: NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to look up project" },
        { status: 500 },
      ),
    };
  }
  if (!projectSnap.exists) {
    return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  }
  if (projectSnap.data()?.ownerId !== decoded.uid) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { uid: decoded.uid };
}
