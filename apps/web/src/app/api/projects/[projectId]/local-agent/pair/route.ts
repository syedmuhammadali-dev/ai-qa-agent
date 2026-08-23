import { NextRequest, NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { requireOwnedProject } from "@/lib/projects/server";
import { signPairingCode } from "@/lib/local-agent/tokens";

const TTL_SECONDS = 10 * 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  if (!isFirebaseAdminConfigured || !process.env.LOCAL_AGENT_SHARED_SECRET) {
    return NextResponse.json({ error: "Local agent pairing is not configured" }, { status: 503 });
  }
  const { projectId } = await params;
  const auth = await requireOwnedProject(req, projectId);
  if (auth.error) return auth.error;

  const code = signPairingCode({ uid: auth.uid, projectId });
  return NextResponse.json({ code, expiresInSeconds: TTL_SECONDS });
}
