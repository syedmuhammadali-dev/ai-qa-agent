"use client";

import { use } from "react";
import { CliCommandCard } from "@/components/layout/cli-command-card";

export default function ArchitecturePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);

  return (
    <CliCommandCard
      projectId={projectId}
      title="Architecture analysis"
      description="Runs on your own machine. Builds a real import graph from your source files and reports actual circular dependencies (with the exact cycle), oversized files (real line counts), and high-coupling files (real fan-in/fan-out) — no cloning, no guessing."
      command="ai-qa-agent architecture"
      footnote="Module-boundary and scalability review build on this in a later pass."
    />
  );
}
