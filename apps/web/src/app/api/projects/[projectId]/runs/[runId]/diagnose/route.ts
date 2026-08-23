import { NextRequest, NextResponse } from "next/server";
import { getAIProvider, type AIProviderConfig } from "@ai-qa-agent/ai";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { requireOwnedProject } from "@/lib/projects/server";

const SYSTEM_PROMPT = `You are a senior SDET diagnosing a failed command from real captured output.
Given the command that was run and its real stdout/stderr, explain:
1. The most likely root cause (be specific, cite the exact error text).
2. Whether a fix looks SAFE to automate, REVIEW_REQUIRED (touches business/auth/db logic), or DANGEROUS (production/destructive).
3. A concrete suggested next step.
Keep it under 200 words. If the log doesn't contain enough information to diagnose confidently, say so explicitly instead of guessing.`;

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

  const runSnap = await getAdminDb().collection("projects").doc(projectId).collection("runs").doc(runId).get();
  if (!runSnap.exists) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  const run = runSnap.data()!;
  if (run.status !== "failed") {
    return NextResponse.json({ error: "This run did not fail — nothing to diagnose" }, { status: 400 });
  }

  const configSnap = await getAdminDb()
    .collection("projects")
    .doc(projectId)
    .collection("private")
    .doc("ai-config")
    .get();
  if (!configSnap.exists) {
    return NextResponse.json(
      { error: "No AI provider configured for this project. Add one in Settings." },
      { status: 400 }
    );
  }
  const config = configSnap.data() as AIProviderConfig;

  try {
    const provider = getAIProvider(config.provider);
    const response = await provider.chat(config, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Command: ${run.command}\nExit code: ${run.exitCode}\n\nLog:\n${String(run.log ?? "").slice(-6000)}`,
        },
      ],
      temperature: 0.2,
      maxTokens: 500,
    });

    const diagnosis = { summary: response.content, model: response.model, generatedAt: Date.now() };
    await runSnap.ref.update({ diagnosis });

    return NextResponse.json({ diagnosis });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI diagnosis failed" },
      { status: 502 }
    );
  }
}
