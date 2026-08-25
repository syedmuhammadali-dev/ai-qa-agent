import { NextRequest, NextResponse } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";
import {
  computeReadinessReport,
  renderHtmlReport,
  renderMarkdownReport,
  type CheckStatus,
  type ReportCategoryInput,
} from "@ai-qa-agent/report-generator";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { requireOwnedProject } from "@/lib/projects/server";

/** Maps a real command-audit category (from command-policy's classification,
 * or a direct-check CLI command) to the human-facing report category it
 * represents. Anything not listed here doesn't feed the report. */
const CATEGORY_MAP: Record<string, string> = {
  test: "Tests",
  lint: "Lint",
  typecheck: "Typecheck",
  build: "Build",
  "security-scan": "Security",
  "accessibility-check": "Accessibility",
  "performance-check": "Performance",
  "api-check": "API",
  architecture: "Architecture",
  "browser-navigation": "Browser",
};

function statusFromAudit(decision: string, exitCode: number | null): CheckStatus {
  if (decision === "blocked") return "BLOCKED";
  if (exitCode === null) return "REQUIRES_HUMAN_REVIEW";
  return exitCode === 0 ? "PASS" : "FAIL";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
  }
  const { projectId } = await params;
  const auth = await requireOwnedProject(req, projectId);
  if (auth.error) return auth.error;

  const format = req.nextUrl.searchParams.get("format") ?? "json";
  if (!["json", "markdown", "html"].includes(format)) {
    return NextResponse.json({ error: 'format must be "json", "markdown", or "html"' }, { status: 400 });
  }

  const projectSnap = await getAdminDb().collection("projects").doc(projectId).get();
  if (!projectSnap.exists) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const project = projectSnap.data()!;

  const commandsSnap = await getAdminDb()
    .collection("projects")
    .doc(projectId)
    .collection("commands")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const latestByCategory = new Map<string, DocumentData>();
  for (const doc of commandsSnap.docs) {
    const data = doc.data();
    const reportCategory = CATEGORY_MAP[data.category];
    if (reportCategory && !latestByCategory.has(reportCategory)) {
      latestByCategory.set(reportCategory, data);
    }
  }

  const categories: ReportCategoryInput[] = Object.values(CATEGORY_MAP)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .map((reportCategory) => {
      const audit = latestByCategory.get(reportCategory);
      if (!audit) {
        return {
          category: reportCategory,
          status: "NOT_RUN" as const,
          details: "No command in this category has been run yet.",
        };
      }
      const status = statusFromAudit(audit.decision, audit.exitCode);
      return {
        category: reportCategory,
        status,
        details: `Last run ${new Date(audit.createdAt).toLocaleString()}: \`${audit.command}\` — exit ${audit.exitCode ?? "n/a"} (${audit.decision}).`,
        evidence: [audit.id ?? ""].filter(Boolean),
      };
    });

  const runsSnap = await getAdminDb()
    .collection("projects")
    .doc(projectId)
    .collection("runs")
    .orderBy("startedAt", "desc")
    .limit(50)
    .get();

  const runsWithFix = runsSnap.docs.filter((d) => d.data().fix);
  const latestFix = runsWithFix[0]?.data().fix;
  categories.push(
    !latestFix
      ? { category: "Safe Auto-Fix", status: "NOT_RUN", details: "No fix has been proposed yet." }
      : latestFix.status === "applied"
        ? { category: "Safe Auto-Fix", status: "PASS", details: `Applied to ${latestFix.filePath}; regression suite passed.` }
        : latestFix.status === "regression_failed"
          ? { category: "Safe Auto-Fix", status: "FAIL", details: `Applied to ${latestFix.filePath}, but the regression suite failed afterward.` }
          : latestFix.safety === "DANGEROUS"
            ? { category: "Safe Auto-Fix", status: "REQUIRES_HUMAN_REVIEW", details: `Fix for ${latestFix.filePath} classified DANGEROUS — blocked from auto-apply, needs manual review.` }
            : { category: "Safe Auto-Fix", status: "REQUIRES_HUMAN_REVIEW", details: `Fix for ${latestFix.filePath} is "${latestFix.status}" — awaiting a human decision.` },
  );

  const runsWithRelease = runsSnap.docs.filter((d) => d.data().release);
  const latestRelease = runsWithRelease[0]?.data().release;
  categories.push(
    !latestRelease
      ? { category: "GitHub Release", status: "NOT_RUN", details: "No release has been planned yet." }
      : latestRelease.status === "pushed"
        ? { category: "GitHub Release", status: "PASS", details: `Pushed ${latestRelease.branchName}${latestRelease.prUrl ? ` — ${latestRelease.prUrl}` : ""}.` }
        : latestRelease.status === "failed"
          ? { category: "GitHub Release", status: "FAIL", details: `Push failed: ${latestRelease.failureReason ?? "unknown reason"}.` }
          : { category: "GitHub Release", status: "REQUIRES_HUMAN_REVIEW", details: `Release "${latestRelease.branchName}" is "${latestRelease.status}" — awaiting a human decision.` },
  );

  const report = computeReadinessReport(project.name ?? "Untitled project", categories);

  if (format === "markdown") {
    return new NextResponse(renderMarkdownReport(report), {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }
  if (format === "html") {
    return new NextResponse(renderHtmlReport(report), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return NextResponse.json({ report });
}
