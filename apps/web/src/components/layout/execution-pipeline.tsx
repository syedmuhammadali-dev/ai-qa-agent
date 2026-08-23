"use client";

import { useEffect, useState } from "react";
import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommands } from "@/lib/commands/use-commands";
import { useLocalAgent } from "@/lib/local-agent/use-local-agent";
import type { Project } from "@/lib/projects/types";

interface Step {
  label: string;
  done: boolean;
}

/**
 * Every step here reflects something we can actually observe in Firestore —
 * a connected repo, a live (non-revoked) local-agent session, or a command
 * of that category having run at least once. No step is ever shown as done
 * without real evidence.
 */
export function ExecutionPipeline({ projectId, project }: { projectId: string; project: Project }) {
  const { commands } = useCommands(projectId);
  const { listSessions } = useLocalAgent(projectId);
  const [agentConnected, setAgentConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    listSessions()
      .then((sessions) => {
        if (!cancelled) setAgentConnected(sessions.some((s) => !s.revoked));
      })
      .catch(() => {
        if (!cancelled) setAgentConnected(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const categories = new Set(commands.map((c) => c.category));

  const steps: Step[] = [
    { label: "Repository Connected", done: Boolean(project.githubRepoUrl) },
    { label: "Local Agent Connected", done: agentConnected === true },
    { label: "Tests Executed", done: categories.has("test") },
    { label: "Browser Checked", done: categories.has("browser-navigation") },
    { label: "API Checked", done: categories.has("api-check") },
  ];

  return (
    <div className="flex flex-col">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border",
                step.done ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-border text-muted-foreground"
              )}
            >
              {step.done ? (
                <Check className="h-3.5 w-3.5" />
              ) : agentConnected === null && i <= 1 ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Circle className="h-2 w-2 fill-current" />
              )}
            </div>
            {i < steps.length - 1 && <div className={cn("h-6 w-px", step.done ? "bg-emerald-500/50" : "bg-border")} />}
          </div>
          <span className={cn("pb-6 text-sm", step.done ? "text-foreground" : "text-muted-foreground")}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}
