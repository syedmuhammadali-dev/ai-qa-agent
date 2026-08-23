"use client";

import { useCallback, useEffect, useState } from "react";
import type { AIProviderId, RedactedAIProviderConfig } from "@ai-qa-agent/ai";
import { useAuth } from "@/lib/auth/auth-context";

export function useAiConfig(projectId: string) {
  const { user } = useAuth();
  const [config, setConfig] = useState<RedactedAIProviderConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/projects/${projectId}/ai-config`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setConfig(data.config);
    }
    setLoading(false);
  }, [user, projectId]);

  // Fetch-on-mount with a manually re-triggerable refresh; state is only set after
  // the awaited fetch resolves, so this is not an unguarded synchronous update.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function save(input: { provider: AIProviderId; apiKey: string; model: string; baseUrl?: string }) {
    if (!user) throw new Error("Not authenticated");
    const token = await user.getIdToken();
    const res = await fetch(`/api/projects/${projectId}/ai-config`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to save AI config");
    setConfig(data.config);
    return data.config as RedactedAIProviderConfig;
  }

  return { config, loading, save, refresh };
}
