import { NextRequest, NextResponse } from "next/server";
import { getAIProvider, redactApiKey, type AIProviderConfig, type AIProviderId } from "@ai-qa-agent/ai";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { requireOwnedProject } from "@/lib/projects/server";

const VALID_PROVIDERS: AIProviderId[] = ["openrouter", "gemini", "openai-compatible"];

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
