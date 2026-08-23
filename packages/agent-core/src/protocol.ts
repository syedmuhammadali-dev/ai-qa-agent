import type { PermissionMode, PolicyDecision, RiskLevel } from "@ai-qa-agent/command-policy";

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
}

/** What's stored in Firestore projects/{id}/commands/{commandId} and read back by the UI. */
export interface CommandAuditRecord extends CommandAuditInput {
  id: string;
  createdAt: number;
}
