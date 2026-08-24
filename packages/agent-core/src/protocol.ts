import type {
  PermissionMode,
  PolicyDecision,
  RiskLevel,
} from "@ai-qa-agent/command-policy";

/** Returned by POST /api/local-agent/exchange after a pairing code is redeemed. */
export interface LocalAgentSession {
  sessionToken: string;
  projectId: string;
  projectName: string;
}

/** Body the local agent sends after attempting (or being refused) a command. */
export interface CommandAuditInput {
  command: string;
  reason: string;
  risk: RiskLevel;
  category: string;
  decision: PolicyDecision;
  permissionMode: PermissionMode;
  approved: boolean;
  editedFromCommand?: string;
  exitCode: number | null;
  durationMs: number;
  outputHash: string;
  stdoutPreview: string;
  stderrPreview: string;
  runId?: string;
}

/** What's stored in Firestore projects/{id}/commands/{commandId} and read back by the UI. */
export interface CommandAuditRecord extends CommandAuditInput {
  id: string;
  createdAt: number;
}

export type RunStatus = "running" | "completed" | "failed";

/** Live/replayable execution record streamed to Firestore projects/{id}/runs/{runId}
 * while a command is actually executing, so the dashboard can show real progress —
 * never a simulated one. */
export interface RunDiagnosis {
  summary: string;
  model: string;
  generatedAt: number;
}

export type FixStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "applied"
  | "regression_failed";
export type FixSafety = "SAFE" | "REVIEW_REQUIRED" | "DANGEROUS";

export interface FixProposal {
  filePath: string;
  targetReason: string;
  originalContent: string;
  patchedContent: string;
  explanation: string;
  safety: FixSafety;
  status: FixStatus;
  createdAt: number;
  decidedAt?: number;
  appliedAt?: number;
  regressionLog?: string;
  regressionExitCode?: number | null;
}

/** A fix pending application, as the local agent sees it (no need for the
 * run-level metadata it doesn't use). */
export interface PendingFix extends FixProposal {
  runId: string;
}

export interface RunRecord {
  id: string;
  command: string;
  category: string;
  status: RunStatus;
  startedAt: number;
  finishedAt: number | null;
  exitCode: number | null;
  log: string;
  diagnosis?: RunDiagnosis;
  fix?: FixProposal;
  /** Firebase Storage paths — only present if the project opted into cloud
   * evidence upload; local screenshots are the default and stay local. */
  evidencePaths?: string[];
}
