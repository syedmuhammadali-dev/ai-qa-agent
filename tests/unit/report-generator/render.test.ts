import { describe, expect, it } from "vitest";
import { computeReadinessReport, renderHtmlReport, renderMarkdownReport } from "@ai-qa-agent/report-generator";

const sampleReport = computeReadinessReport("demo-project", [
  { category: "Tests", status: "PASS", details: "12/12 passed", evidence: ["run-abc123"] },
  { category: "Security", status: "FAIL", details: "1 critical <script> finding", evidence: ["src/x.ts:12"] },
  { category: "Accessibility", status: "NOT_RUN", details: "never run" },
]);

describe("renderMarkdownReport", () => {
  it("includes the project name, score, formula, and every category", () => {
    const md = renderMarkdownReport(sampleReport);
    expect(md).toContain("demo-project");
    expect(md).toContain("Tests");
    expect(md).toContain("Security");
    expect(md).toContain("Accessibility");
    expect(md).toContain("run-abc123");
    expect(md).toContain(sampleReport.scoreFormula);
  });
});

describe("renderHtmlReport", () => {
  it("escapes evidence/details content so it can never break out of the HTML document", () => {
    const html = renderHtmlReport(sampleReport);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("is a self-contained document with no external network requests", () => {
    const html = renderHtmlReport(sampleReport);
    expect(html).toContain("<!doctype html>");
    expect(html).not.toMatch(/https?:\/\//);
  });
});
