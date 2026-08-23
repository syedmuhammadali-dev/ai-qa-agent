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

  const projectSnap = await getAdminDb().collection("projects").doc(projectId).get();
  if (!projectSnap.exists) {
    return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  }
  if (projectSnap.data()?.ownerId !== decoded.uid) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { uid: decoded.uid };
}
