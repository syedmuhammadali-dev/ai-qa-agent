import { hostname } from "node:os";
import type { CommandAuditInput, LocalAgentSession } from "@ai-qa-agent/agent-core";
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
    throw new ApiError(res.status, data.error ?? `Request to ${url} failed: ${res.status}`);
  }
  return data as T;
}

export async function exchangePairingCode(apiUrl: string, code: string): Promise<LocalAgentSession> {
  return request<LocalAgentSession>(`${apiUrl}/api/local-agent/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, deviceLabel: hostname() }),
  });
}

export async function fetchPermissionMode(apiUrl: string, sessionToken: string, projectId: string): Promise<PermissionMode> {
  const data = await request<{ mode: PermissionMode }>(
    `${apiUrl}/api/projects/${projectId}/permission-mode`,
    { headers: { Authorization: `Bearer ${sessionToken}` } }
  );
  return data.mode;
}

export async function submitCommandAudit(
  apiUrl: string,
  sessionToken: string,
  projectId: string,
  record: CommandAuditInput
): Promise<void> {
  await request(`${apiUrl}/api/projects/${projectId}/commands`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sessionToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
}
