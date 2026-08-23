"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  GitHubBranch,
  GitHubCompareResult,
  GitHubFileContent,
  GitHubRepo,
  GitHubTreeEntry,
} from "@ai-qa-agent/github";
import { useAuth } from "@/lib/auth/auth-context";

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

export function useGitHubConnection() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [login, setLogin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const data = await authedFetch(user, "/api/github/status");
    setConnected(Boolean(data.connected));
    setLogin(data.login ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // Fetch-on-mount; state is only set after the awaited request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function connect(projectId: string) {
    if (!user) throw new Error("Not authenticated");
    const data = await authedFetch(user, `/api/auth/github/authorize-url?projectId=${projectId}`);
    window.location.href = data.url;
  }

  async function disconnect() {
    if (!user) throw new Error("Not authenticated");
    await authedFetch(user, "/api/github/disconnect", { method: "POST" });
    setConnected(false);
    setLogin(null);
  }

  return { connected, login, loading, connect, disconnect, refresh };
}

export function useGitHubActions() {
  const { user } = useAuth();

  return {
    async listRepos(): Promise<GitHubRepo[]> {
      if (!user) throw new Error("Not authenticated");
      const data = await authedFetch(user, "/api/github/repos");
      return data.repos;
    },
    async listBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
      if (!user) throw new Error("Not authenticated");
      const data = await authedFetch(user, `/api/github/repos/${owner}/${repo}/branches`);
      return data.branches;
    },
    async compare(owner: string, repo: string, base: string, head: string): Promise<GitHubCompareResult> {
      if (!user) throw new Error("Not authenticated");
      const data = await authedFetch(
        user,
        `/api/github/repos/${owner}/${repo}/compare?base=${encodeURIComponent(base)}&head=${encodeURIComponent(head)}`
      );
      return data.compare;
    },
    async getTree(owner: string, repo: string, ref: string): Promise<GitHubTreeEntry[]> {
      if (!user) throw new Error("Not authenticated");
      const data = await authedFetch(
        user,
        `/api/github/repos/${owner}/${repo}/tree?ref=${encodeURIComponent(ref)}`
      );
      return data.tree;
    },
    async getFileContent(owner: string, repo: string, path: string, ref: string): Promise<GitHubFileContent> {
      if (!user) throw new Error("Not authenticated");
      const data = await authedFetch(
        user,
        `/api/github/repos/${owner}/${repo}/content?path=${encodeURIComponent(path)}&ref=${encodeURIComponent(ref)}`
      );
      return data.file;
    },
  };
}
