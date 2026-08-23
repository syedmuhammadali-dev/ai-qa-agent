"use client";

import { useAuth } from "@/lib/auth/auth-context";

export interface LocalAgentSessionSummary {
  id: string;
  deviceLabel: string;
  createdAt: number;
  lastSeenAt: number;
  revoked: boolean;
}

async function authedFetch(user: { getIdToken: () => Promise<string> }, path: string, init?: RequestInit) {
  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`);
  return data;
}

export function useLocalAgent(projectId: string) {
  const { user } = useAuth();

  return {
    async generatePairingCode(): Promise<{ code: string; expiresInSeconds: number }> {
      if (!user) throw new Error("Not authenticated");
      return authedFetch(user, `/api/projects/${projectId}/local-agent/pair`, { method: "POST" });
    },
    async listSessions(): Promise<LocalAgentSessionSummary[]> {
      if (!user) throw new Error("Not authenticated");
      const data = await authedFetch(user, `/api/projects/${projectId}/local-agent/sessions`);
      return data.sessions;
    },
    async revokeSession(sessionId: string): Promise<void> {
      if (!user) throw new Error("Not authenticated");
      await authedFetch(user, `/api/projects/${projectId}/local-agent/sessions?sessionId=${sessionId}`, {
        method: "DELETE",
      });
    },
  };
}
