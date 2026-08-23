import { NextRequest, NextResponse } from "next/server";
import { getAIProvider, redactApiKey, type AIProviderConfig, type AIProviderId } from "@ai-qa-agent/ai";
import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

const VALID_PROVIDERS: AIProviderId[] = ["openrouter", "gemini", "openai-compatible"];

async function requireOwnedProject(req: NextRequest, projectId: string) {
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
  }
  const { projectId } = await params;
  const auth = await requireOwnedProject(req, projectId);
  if (auth.error) return auth.error;

  const configSnap = await getAdminDb()
    .collection("projects")
    .doc(projectId)
    .collection("private")
    .doc("ai-config")
    .get();

  if (!configSnap.exists) return NextResponse.json({ config: null });
  const stored = configSnap.data() as Record<string, unknown>;
  const redacted = Object.fromEntries(Object.entries(stored).filter(([key]) => key !== "apiKey"));
  return NextResponse.json({ config: redacted });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
  }
  const { projectId } = await params;
  const auth = await requireOwnedProject(req, projectId);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const { provider, apiKey, model, baseUrl } = body ?? {};

  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  if (typeof apiKey !== "string" || apiKey.trim().length < 8) {
    return NextResponse.json({ error: "API key looks invalid" }, { status: 400 });
  }
  if (typeof model !== "string" || model.trim().length === 0) {
    return NextResponse.json({ error: "Model is required" }, { status: 400 });
  }

  const config: AIProviderConfig = { provider, apiKey, model, baseUrl: baseUrl || undefined };

  const result = await getAIProvider(provider).testConnection(config);
  if (!result.ok) {
    return NextResponse.json({ error: `Key validation failed: ${result.error}` }, { status: 400 });
  }

  await getAdminDb()
    .collection("projects")
    .doc(projectId)
    .collection("private")
    .doc("ai-config")
    .set(config);

  return NextResponse.json({ config: redactApiKey(config) });
}
