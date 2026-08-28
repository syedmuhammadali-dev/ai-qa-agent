"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiConfig } from "@/lib/ai/use-ai-config";
import { useLocalAgent } from "@/lib/local-agent/use-local-agent";
import { useCommands } from "@/lib/commands/use-commands";
import type { Project } from "@/lib/projects/types";

/**
 * Guided setup checklist for a first-time project, shown on the dashboard.
 * Every step reflects real observed state (same discipline as ExecutionPipeline
 * on the Overview page) — never a static tutorial. Disappears once the project
 * has real run history, so it never lingers once the user is past onboarding.
 */
export function OnboardingChecklist({ project }: { project: Project }) {
  const { config, loading: configLoading } = useAiConfig(project.id);
  const { listSessions } = useLocalAgent(project.id);
  const { commands, loading: commandsLoading } = useCommands(project.id);
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
  }, [project.id]);

  if (!commandsLoading && commands.length > 0) return null;

  const steps = [
    {
      label: "Connect a repository",
      done: Boolean(project.githubRepoUrl),
      href: `/projects/${project.id}/github`,
      pending: false,
    },
    {
      label: "Configure an AI provider",
      done: Boolean(config),
      href: `/projects/${project.id}/settings`,
      pending: configLoading,
    },
    {
      label: "Connect the local agent",
      done: agentConnected === true,
      href: `/projects/${project.id}/settings`,
      pending: agentConnected === null,
    },
    {
      label: "Run your first audit",
      done: false,
      href: `/projects/${project.id}/settings`,
      pending: commandsLoading,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border/50 bg-card p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Getting started with {project.name}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {doneCount} of {steps.length} steps complete
          </p>
        </div>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(doneCount / steps.length) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {steps.map((step) => (
          <Link
            key={step.label}
            href={step.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
              step.done
                ? "border-emerald-500/20 bg-emerald-500/5 text-foreground"
                : "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground"
            )}
          >
            {step.done ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : step.pending ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Circle className="h-3 w-3 shrink-0 fill-current opacity-40" />
            )}
            {step.label}
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
