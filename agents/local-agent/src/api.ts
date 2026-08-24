import { hostname } from "node:os";
import type {
  CommandAuditInput,
  LocalAgentSession,
  PendingFix,
  RunStatus,
} from "@ai-qa-agent/agent-core";
import type { PermissionMode } from "@ai-qa-agent/command-policy";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.error ?? `Request to ${url} failed: ${res.status}`,
    );
  }
  return data as T;
}

export async function exchangePairingCode(
  apiUrl: string,
  code: string,
): Promise<LocalAgentSession> {
  return request<LocalAgentSession>(`${apiUrl}/api/local-agent/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, deviceLabel: hostname() }),
  });
}

export async function fetchPermissionMode(
  apiUrl: string,
  sessionToken: string,
  projectId: string,
): Promise<PermissionMode> {
  const data = await request<{ mode: PermissionMode }>(
    `${apiUrl}/api/projects/${projectId}/permission-mode`,
    { headers: { Authorization: `Bearer ${sessionToken}` } },
  );
  return data.mode;
}

export async function submitCommandAudit(
  apiUrl: string,
  sessionToken: string,
  projectId: string,
  record: CommandAuditInput,
): Promise<void> {
  await request(`${apiUrl}/api/projects/${projectId}/commands`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(record),
  });
}

export async function createRun(
  apiUrl: string,
  sessionToken: string,
  projectId: string,
  command: string,
  category: string,
): Promise<string> {
  const data = await request<{ runId: string }>(
    `${apiUrl}/api/projects/${projectId}/runs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command, category }),
    },
  );
  return data.runId;
}

export async function updateRun(
  apiUrl: string,
  sessionToken: string,
  projectId: string,
  runId: string,
  update: {
    log?: string;
    status?: RunStatus;
    exitCode?: number | null;
    finishedAt?: number;
  },
): Promise<void> {
  await request(`${apiUrl}/api/projects/${projectId}/runs/${runId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(update),
  }).catch((err) => {
    // Live-log updates are best-effort — never let a flaky network call abort a running command.
    console.error(
      `(failed to update run ${runId}: ${err instanceof Error ? err.message : err})`,
    );
  });
}

export async function uploadEvidence(
  apiUrl: string,
  sessionToken: string,
  projectId: string,
  runId: string,
  filename: string,
  contentType: string,
  base64Content: string,
): Promise<{ uploaded: boolean; reason?: string; path?: string }> {
  return request(`${apiUrl}/api/projects/${projectId}/evidence/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ runId, filename, contentType, base64Content }),
  });
}

export async function fetchPendingFixes(
  apiUrl: string,
  sessionToken: string,
  projectId: string,
): Promise<PendingFix[]> {
  const data = await request<{ fixes: PendingFix[] }>(
    `${apiUrl}/api/projects/${projectId}/fixes/pending`,
    {
      headers: { Authorization: `Bearer ${sessionToken}` },
    },
  );
  return data.fixes;
}

export async function reportFixApplied(
  apiUrl: string,
  sessionToken: string,
  projectId: string,
  runId: string,
  result: {
    regressionPassed: boolean;
    regressionLog: string;
    regressionExitCode: number | null;
  },
): Promise<void> {
  await request(
    `${apiUrl}/api/projects/${projectId}/runs/${runId}/fix-applied`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result),
    },
  );
}
