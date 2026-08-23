import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createLocalFileProvider } from "@ai-qa-agent/project-analyzer";
import { analyzeArchitecture, buildImportGraph, findCircularDependencies } from "@ai-qa-agent/code-analyzer";

const FIXTURE = resolve(__dirname, "../../../fixtures/sample-projects/circular-deps");

describe("buildImportGraph + findCircularDependencies against a real fixture", () => {
  it("finds the real a.ts <-> b.ts cycle", async () => {
    const provider = createLocalFileProvider(FIXTURE);
    const graph = await buildImportGraph(provider);
    const cycles = findCircularDependencies(graph);

    expect(cycles.length).toBeGreaterThan(0);
    const involvesAB = cycles.some(
      (c) => c.cycle.some((f) => f.endsWith("a.ts")) && c.cycle.some((f) => f.endsWith("b.ts"))
    );
    expect(involvesAB).toBe(true);
  });

  it("does not flag a file with no imports as part of a cycle", async () => {
    const provider = createLocalFileProvider(FIXTURE);
    const graph = await buildImportGraph(provider);
    const cycles = findCircularDependencies(graph);
    const involvesClean = cycles.some((c) => c.cycle.some((f) => f.endsWith("clean.ts")));
    expect(involvesClean).toBe(false);
  });
});

describe("analyzeArchitecture against a real fixture", () => {
  it("reports the real cycle and the real oversized file as findings", async () => {
    const provider = createLocalFileProvider(FIXTURE);
    const result = await analyzeArchitecture(provider);

    expect(result.circularDependencies.length).toBeGreaterThan(0);
    expect(result.oversizedFiles.some((f) => f.path.endsWith("big.ts"))).toBe(true);
    expect(result.oversizedFiles.find((f) => f.path.endsWith("big.ts"))?.lines).toBeGreaterThan(300);

    const findingProblems = result.findings.map((f) => f.problem);
    expect(findingProblems.some((p) => p.includes("Circular"))).toBe(true);
    expect(findingProblems.some((p) => p.includes("Oversized"))).toBe(true);
  });

  it("does not report an oversized finding for a small file", async () => {
    const provider = createLocalFileProvider(FIXTURE);
    const result = await analyzeArchitecture(provider);
    expect(result.oversizedFiles.some((f) => f.path.endsWith("clean.ts"))).toBe(false);
  });
});
