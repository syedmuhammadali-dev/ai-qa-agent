export type SecuritySeverity = "low" | "medium" | "high" | "critical";

export interface SecurityFinding {
  category: string;
  problem: string;
  evidence: string;
  severity: SecuritySeverity;
  recommendation: string;
}

export interface SecurityScanResult {
  filesScanned: number;
  findings: SecurityFinding[];
}
