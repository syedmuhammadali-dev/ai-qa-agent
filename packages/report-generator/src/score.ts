import type { CheckStatus, ProductionReadinessReport, ReportCategoryInput, ReportCategoryResult } from "./types.ts";

const SCORED_STATUSES: CheckStatus[] = ["PASS", "FAIL", "BLOCKED"];

function defaultScore(status: CheckStatus, score: number | undefined): number {
  if (typeof score === "number") return Math.max(0, Math.min(100, score));
  return status === "PASS" ? 100 : 0;
}

/**
 * Turns raw per-category evidence into a full report with a transparently
 * computed overall score. The formula is deliberately simple and stated in
 * `scoreFormula` on the result, never hidden:
 *
 *   overallScore = sum(category.score * category.weight) / sum(category.weight)
 *
 * ...over only the categories that were actually attempted (PASS/FAIL/BLOCKED).
 * NOT_RUN, SKIPPED, and REQUIRES_HUMAN_REVIEW categories are excluded from
 * both the numerator and denominator — they cannot inflate the score by being
 * silently treated as passing, and they're listed in `excludedFromScore` so
 * the omission itself is visible.
 */
export function computeReadinessReport(
  projectName: string,
  categoryInputs: ReportCategoryInput[],
): ProductionReadinessReport {
  const categories: ReportCategoryResult[] = categoryInputs.map((input) => {
    const weight = input.weight ?? 1;
    const countedInScore = SCORED_STATUSES.includes(input.status);
    return {
      category: input.category,
      status: input.status,
      score: defaultScore(input.status, input.score),
      weight,
      details: input.details,
      evidence: input.evidence ?? [],
      countedInScore,
    };
  });

  const counted = categories.filter((c) => c.countedInScore);
  const totalWeight = counted.reduce((sum, c) => sum + c.weight, 0);
  const overallScore =
    totalWeight === 0 ? null : counted.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight;

  let overallStatus: CheckStatus;
  if (categories.some((c) => c.status === "FAIL")) {
    overallStatus = "FAIL";
  } else if (categories.some((c) => c.status === "BLOCKED")) {
    overallStatus = "BLOCKED";
  } else if (categories.some((c) => c.status === "REQUIRES_HUMAN_REVIEW")) {
    overallStatus = "REQUIRES_HUMAN_REVIEW";
  } else if (counted.length === 0) {
    overallStatus = "NOT_RUN";
  } else {
    overallStatus = "PASS";
  }

  return {
    projectName,
    generatedAt: Date.now(),
    categories,
    overallScore,
    overallStatus,
    scoreFormula:
      "overallScore = sum(category.score x category.weight) / sum(category.weight), " +
      "counting only categories that actually ran (PASS/FAIL/BLOCKED). " +
      `${categories.length - counted.length} of ${categories.length} categories were excluded ` +
      "from the score because they were not run, skipped, or require human review.",
    excludedFromScore: categories.filter((c) => !c.countedInScore).map((c) => c.category),
  };
}
