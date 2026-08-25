import { describe, expect, it } from "vitest";
import { computeReadinessReport } from "@ai-qa-agent/report-generator";

describe("computeReadinessReport", () => {
  it("averages PASS/FAIL/BLOCKED categories weighted, defaulting PASS to 100 and FAIL to 0", () => {
    const report = computeReadinessReport("demo", [
      { category: "Tests", status: "PASS", details: "12/12 passed" },
      { category: "Security", status: "FAIL", details: "1 critical finding" },
    ]);
    expect(report.overallScore).toBe(50);
    expect(report.overallStatus).toBe("FAIL");
  });

  it("never lets NOT_RUN/SKIPPED/REQUIRES_HUMAN_REVIEW categories inflate the score", () => {
    const report = computeReadinessReport("demo", [
      { category: "Tests", status: "PASS", details: "ok" },
      { category: "Accessibility", status: "NOT_RUN", details: "never run" },
      { category: "Performance", status: "SKIPPED", details: "skipped by user" },
      { category: "Manual review", status: "REQUIRES_HUMAN_REVIEW", details: "needs a human" },
    ]);
    // Only "Tests" counts, so the score reflects just that, not an inflated 100 across 4 categories.
    expect(report.overallScore).toBe(100);
    expect(report.excludedFromScore).toEqual(["Accessibility", "Performance", "Manual review"]);
    // Even though the only *scored* category passed, REQUIRES_HUMAN_REVIEW must still surface.
    expect(report.overallStatus).toBe("REQUIRES_HUMAN_REVIEW");
  });

  it("respects custom weights", () => {
    const report = computeReadinessReport("demo", [
      { category: "A", status: "PASS", weight: 3, details: "x" },
      { category: "B", status: "FAIL", weight: 1, details: "x" },
    ]);
    // (100*3 + 0*1) / 4 = 75
    expect(report.overallScore).toBe(75);
  });

  it("respects an explicit partial score instead of defaulting", () => {
    const report = computeReadinessReport("demo", [{ category: "A", status: "PASS", score: 60, details: "x" }]);
    expect(report.overallScore).toBe(60);
  });

  it("clamps an out-of-range explicit score to [0, 100]", () => {
    const over = computeReadinessReport("demo", [{ category: "A", status: "PASS", score: 150, details: "x" }]);
    const under = computeReadinessReport("demo", [{ category: "A", status: "FAIL", score: -20, details: "x" }]);
    expect(over.overallScore).toBe(100);
    expect(under.overallScore).toBe(0);
  });

  it("returns a null score, not zero, when nothing was actually run", () => {
    const report = computeReadinessReport("demo", [{ category: "A", status: "NOT_RUN", details: "x" }]);
    expect(report.overallScore).toBeNull();
    expect(report.overallStatus).toBe("NOT_RUN");
  });

  it("BLOCKED outranks a passing average in overall status, even before REQUIRES_HUMAN_REVIEW", () => {
    const report = computeReadinessReport("demo", [
      { category: "A", status: "PASS", details: "x" },
      { category: "B", status: "BLOCKED", details: "x" },
      { category: "C", status: "REQUIRES_HUMAN_REVIEW", details: "x" },
    ]);
    expect(report.overallStatus).toBe("BLOCKED");
  });

  it("FAIL outranks everything else", () => {
    const report = computeReadinessReport("demo", [
      { category: "A", status: "FAIL", details: "x" },
      { category: "B", status: "BLOCKED", details: "x" },
      { category: "C", status: "REQUIRES_HUMAN_REVIEW", details: "x" },
    ]);
    expect(report.overallStatus).toBe("FAIL");
  });

  it("the score formula is stated in plain text on the result, not hidden", () => {
    const report = computeReadinessReport("demo", [{ category: "A", status: "PASS", details: "x" }]);
    expect(report.scoreFormula).toContain("sum(category.score");
  });
});
