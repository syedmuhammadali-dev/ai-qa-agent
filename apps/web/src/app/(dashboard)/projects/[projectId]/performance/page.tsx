"use client";

import { use } from "react";
import { CliCommandCard } from "@/components/layout/cli-command-card";
import { useProject } from "@/lib/projects/use-project";

export default function PerformancePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project } = useProject(projectId);

  return (
    <CliCommandCard
      projectId={projectId}
      title="Performance check"
      description="Runs on your own machine via Playwright. Reports real browser Navigation/Resource Timing metrics — TTFB, DOMContentLoaded, load time, resource count and transfer size from the actual page load that just happened."
      command={`ai-qa-agent perf-check ${project?.frontendUrl ?? "<frontend-url>"}`}
      footnote="A full Lighthouse score is a heavier addition planned for later — these are real numbers now, not a synthetic score."
    />
  );
}
