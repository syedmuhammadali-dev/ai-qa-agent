"use client";

import { use } from "react";
import { CliCommandCard } from "@/components/layout/cli-command-card";

export default function SecurityPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);

  return (
    <CliCommandCard
      projectId={projectId}
      title="Security scan"
      description="Runs on your own machine via the local agent. Statically scans real source files for hardcoded secrets, a tracked .env file, eval(), unsanitized dangerouslySetInnerHTML, SQL built via string interpolation, and CORS wildcards — then runs a real dependency audit (npm/pnpm/yarn audit)."
      command="ai-qa-agent security-scan"
      footnote="Deeper checks (authorization logic, insecure cookies, live header probing against a running app) build on this in a later pass."
    />
  );
}
