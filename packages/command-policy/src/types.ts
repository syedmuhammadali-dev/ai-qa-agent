export type RiskLevel = "read" | "low" | "medium" | "high" | "critical" | "blocked";

export type PermissionMode = "manual" | "auto_safe" | "auto_fix";

export type PolicyDecision = "auto_allow" | "requires_approval" | "blocked";

export interface CommandClassification {
  risk: RiskLevel;
  category: string;
  reason: string;
}

export interface PolicyResult extends CommandClassification {
  decision: PolicyDecision;
  mode: PermissionMode;
}
