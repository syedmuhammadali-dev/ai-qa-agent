import type { FileProvider } from "@ai-qa-agent/project-analyzer";
import type { CouplingMetric, ImportGraph, OversizedFile } from "./types.ts";

export async function findOversizedFiles(
  provider: FileProvider,
  files: string[],
  threshold = 300
): Promise<OversizedFile[]> {
  const results: OversizedFile[] = [];
  for (const file of files) {
    const content = await provider.readFile(file);
    if (!content) continue;
    const lines = content.split("\n").length;
    if (lines > threshold) results.push({ path: file, lines });
  }
  return results.sort((a, b) => b.lines - a.lines);
}

/** fan-out = how many files this file imports; fan-in = how many files import it.
 * High fan-in on a low-level file is normal; high fan-in on a "leaf" business file
 * usually signals it's become an unintentional shared dependency. */
export function computeCoupling(graph: ImportGraph): CouplingMetric[] {
  const fanOut = new Map<string, number>();
  const fanIn = new Map<string, number>();

  for (const file of graph.files) {
    fanOut.set(file, 0);
    fanIn.set(file, 0);
  }
  for (const edge of graph.edges) {
    fanOut.set(edge.from, (fanOut.get(edge.from) ?? 0) + 1);
    fanIn.set(edge.to, (fanIn.get(edge.to) ?? 0) + 1);
  }

  return graph.files
    .map((path) => ({ path, fanIn: fanIn.get(path) ?? 0, fanOut: fanOut.get(path) ?? 0 }))
    .sort((a, b) => b.fanIn + b.fanOut - (a.fanIn + a.fanOut));
}
