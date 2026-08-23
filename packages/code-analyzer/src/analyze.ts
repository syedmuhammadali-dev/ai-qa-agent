import type { FileProvider } from "@ai-qa-agent/project-analyzer";
import { buildImportGraph } from "./import-graph.ts";
import { findCircularDependencies } from "./circular.ts";
import { computeCoupling, findOversizedFiles } from "./metrics.ts";
import type { ArchitectureAnalysis, ArchitectureFinding } from "./types.ts";

const HIGH_FAN_IN_THRESHOLD = 15;

export async function analyzeArchitecture(
  provider: FileProvider,
  options: { oversizedThreshold?: number } = {}
): Promise<ArchitectureAnalysis> {
  const graph = await buildImportGraph(provider);
  const circularDependencies = findCircularDependencies(graph);
  const oversizedFiles = await findOversizedFiles(provider, graph.files, options.oversizedThreshold ?? 300);
  const coupling = computeCoupling(graph);

  const findings: ArchitectureFinding[] = [];

  for (const { cycle } of circularDependencies) {
    findings.push({
      problem: "Circular dependency",
      evidence: cycle.join(" → "),
      risk: "high",
      recommendation:
        "Break the cycle by extracting the shared logic into a separate module that neither side depends back on.",
    });
  }

  for (const file of oversizedFiles.slice(0, 10)) {
    findings.push({
      problem: `Oversized file (${file.lines} lines)`,
      evidence: file.path,
      risk: file.lines > 800 ? "high" : "medium",
      recommendation: "Split into smaller, single-responsibility modules.",
    });
  }

  for (const c of coupling) {
    if (c.fanIn >= HIGH_FAN_IN_THRESHOLD) {
      findings.push({
        problem: `High fan-in (${c.fanIn} files import this)`,
        evidence: c.path,
        risk: "medium",
        recommendation:
          "A change here has a wide blast radius — make sure it has strong test coverage and a stable, minimal public API.",
      });
    }
  }

  return {
    fileCount: graph.files.length,
    circularDependencies,
    oversizedFiles,
    coupling,
    findings,
  };
}
