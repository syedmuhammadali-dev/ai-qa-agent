export interface ImportEdge {
  from: string;
  to: string;
}

export interface ImportGraph {
  files: string[];
  edges: ImportEdge[];
}

export interface CircularDependency {
  cycle: string[];
}

export interface OversizedFile {
  path: string;
  lines: number;
}

export interface CouplingMetric {
  path: string;
  fanIn: number;
  fanOut: number;
}

export interface ArchitectureFinding {
  problem: string;
  evidence: string;
  risk: "low" | "medium" | "high";
  recommendation: string;
}

export interface ArchitectureAnalysis {
  fileCount: number;
  circularDependencies: CircularDependency[];
  oversizedFiles: OversizedFile[];
  coupling: CouplingMetric[];
  findings: ArchitectureFinding[];
}
