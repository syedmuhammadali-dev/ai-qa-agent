import type { CircularDependency, ImportGraph } from "./types.ts";

/** Finds real cycles in the import graph via DFS. Each reported cycle is an
 * actual path through the graph, not a heuristic guess. */
export function findCircularDependencies(graph: ImportGraph): CircularDependency[] {
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from)!.push(edge.to);
  }

  const cycles: CircularDependency[] = [];
  const seenCycleKeys = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const onStack = new Set<string>();

  function dfs(node: string) {
    visited.add(node);
    stack.push(node);
    onStack.add(node);

    for (const next of adjacency.get(node) ?? []) {
      if (onStack.has(next)) {
        const cycleStart = stack.indexOf(next);
        const cycle = [...stack.slice(cycleStart), next];
        const key = [...new Set(cycle)].sort().join("|");
        if (!seenCycleKeys.has(key)) {
          seenCycleKeys.add(key);
          cycles.push({ cycle });
        }
      } else if (!visited.has(next)) {
        dfs(next);
      }
    }

    stack.pop();
    onStack.delete(node);
  }

  for (const file of graph.files) {
    if (!visited.has(file)) dfs(file);
  }

  return cycles;
}
