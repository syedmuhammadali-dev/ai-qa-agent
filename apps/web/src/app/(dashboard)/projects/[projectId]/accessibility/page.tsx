"use client";

import { use } from "react";
import { CliCommandCard } from "@/components/layout/cli-command-card";
import { useProject } from "@/lib/projects/use-project";

export default function AccessibilityPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project } = useProject(projectId);

  return (
    <CliCommandCard
      projectId={projectId}
      title="Accessibility check"
      description="Runs the real axe-core engine (via Playwright) against a live URL on your own machine — never inside this web app. Reports actual violations with impact level and affected elements, not a guess."
      command={`ai-qa-agent a11y-check ${project?.frontendUrl ?? "<frontend-url>"}`}
      footnote="Keyboard-navigation and manual-review checklists build on this in a later pass."
    />
  );
}
