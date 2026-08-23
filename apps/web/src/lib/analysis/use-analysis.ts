"use client";

import { useState } from "react";
import type { ProjectAnalysis } from "@ai-qa-agent/project-analyzer";
import { useAuth } from "@/lib/auth/auth-context";

export function useAnalysis(projectId: string) {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/projects/${projectId}/analyze`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return { analysis, loading, error, analyze };
}
