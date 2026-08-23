import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireUid } from "@/lib/github/server";

export async function GET(req: NextRequest) {
  const auth = await requireUid(req);
  if ("error" in auth) return auth.error;

  const snap = await getAdminDb()
    .collection("users")
    .doc(auth.uid)
    .collection("private")
    .doc("github")
    .get();

  if (!snap.exists) return NextResponse.json({ connected: false });
  const data = snap.data();
  return NextResponse.json({
    connected: true,
    login: data?.login as string | undefined,
    connectedAt: data?.connectedAt as number | undefined,
  });
}
