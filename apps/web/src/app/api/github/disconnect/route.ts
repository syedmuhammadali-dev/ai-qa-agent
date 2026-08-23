import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireUid } from "@/lib/github/server";

export async function POST(req: NextRequest) {
  const auth = await requireUid(req);
  if ("error" in auth) return auth.error;

  await getAdminDb()
    .collection("users")
    .doc(auth.uid)
    .collection("private")
    .doc("github")
    .delete();

  return NextResponse.json({ ok: true });
}
