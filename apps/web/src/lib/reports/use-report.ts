"use client";

import { useState } from "react";
import type { ProductionReadinessReport } from "@ai-qa-agent/report-generator";
import { useAuth } from "@/lib/auth/auth-context";

export function useReport(projectId: string) {
  const { user } = useAuth();
  const [report, setReport] = useState<ProductionReadinessReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/projects/${projectId}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate report");
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  async function download(format: "markdown" | "html") {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/projects/${projectId}/report?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to download report");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `production-readiness-report.${format === "markdown" ? "md" : "html"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return { report, loading, error, generate, download };
}
