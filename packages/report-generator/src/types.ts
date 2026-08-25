/** The only statuses a category (or the overall report) may carry — deliberately
 * includes NOT_RUN/SKIPPED/REQUIRES_HUMAN_REVIEW as distinct, non-passing states
 * so "not tested" can never silently read as "PASS". */
export type CheckStatus =
  | "PASS"
  | "FAIL"
  | "BLOCKED"
  | "NOT_RUN"
  | "SKIPPED"
  | "REQUIRES_HUMAN_REVIEW";

/** Raw input for one category — supplied by whatever assembled the real
 * evidence (Firestore runs, findings, fix records). Never fabricated. */
export interface ReportCategoryInput {
  category: string;
  status: CheckStatus;
  /** 0-100. Only meaningful for PASS/FAIL/BLOCKED; ignored for the other
   * statuses since they're excluded from the score entirely. Defaults to
   * 100 for PASS and 0 for FAIL/BLOCKED if omitted. */
  score?: number;
  /** Relative contribution to the overall score. Defaults to 1 (equal weight). */
  weight?: number;
  details: string;
  evidence?: string[];
}

export interface ReportCategoryResult extends Required<Pick<ReportCategoryInput, "category" | "status" | "details">> {
  score: number;
  weight: number;
  evidence: string[];
  /** Whether this category's score counted toward the overall average. */
  countedInScore: boolean;
}

export interface ProductionReadinessReport {
  projectName: string;
  generatedAt: number;
  categories: ReportCategoryResult[];
  /** null when zero categories were actually attempted (nothing to average). */
  overallScore: number | null;
  overallStatus: CheckStatus;
  /** Human-readable line naming exactly how overallScore was computed, so the
   * number is never a black box. */
  scoreFormula: string;
  /** Categories excluded from the score (NOT_RUN/SKIPPED/REQUIRES_HUMAN_REVIEW),
   * called out explicitly so a high score can't be achieved by omission. */
  excludedFromScore: string[];
}
