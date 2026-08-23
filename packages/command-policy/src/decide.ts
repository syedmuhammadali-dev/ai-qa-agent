import type { PermissionMode, PolicyDecision, PolicyResult, RiskLevel } from "./types.ts";
import { classifyCommand } from "./classify.ts";

// "Automatic" never means unrestricted: BLOCKED is always blocked, and every
// mode still requires approval for HIGH+ risk except the narrow AUTO_FIX case.
const DECISION_TABLE: Record<PermissionMode, Record<RiskLevel, PolicyDecision>> = {
  manual: {
    read: "requires_approval",
    low: "requires_approval",
    medium: "requires_approval",
    high: "requires_approval",
    critical: "requires_approval",
    blocked: "blocked",
  },
  auto_safe: {
    read: "auto_allow",
    low: "auto_allow",
    medium: "requires_approval",
    high: "requires_approval",
    critical: "blocked",
    blocked: "blocked",
  },
  auto_fix: {
    read: "auto_allow",
    low: "auto_allow",
    medium: "auto_allow",
    high: "requires_approval",
    critical: "blocked",
    blocked: "blocked",
  },
};

export function decidePermission(risk: RiskLevel, mode: PermissionMode): PolicyDecision {
  return DECISION_TABLE[mode][risk];
}

export function evaluateCommand(command: string, mode: PermissionMode): PolicyResult {
  const classification = classifyCommand(command);
  return {
    ...classification,
    mode,
    decision: decidePermission(classification.risk, mode),
  };
}
