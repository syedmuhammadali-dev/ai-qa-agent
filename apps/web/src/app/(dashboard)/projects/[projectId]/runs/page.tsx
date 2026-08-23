"use client";

import { use, useState } from "react";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommands } from "@/lib/commands/use-commands";
import type { CommandAuditRecord } from "@ai-qa-agent/agent-core";

const RISK_VARIANT: Record<string, string> = {
  read: "text-muted-foreground",
  low: "text-muted-foreground",
  medium: "text-amber-500",
  high: "text-orange-500",
  critical: "text-red-500",
  blocked: "text-red-600",
};

export default function RunsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { commands, loading } = useCommands(projectId);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-base font-semibold">Command audit log</h2>
        <p className="text-sm text-muted-foreground">
          Every command the local agent attempted, real risk classification and permission
          decision included. Full test-run history (Phase 4) will appear alongside this.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}

      {!loading && commands.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <History className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No commands recorded yet. Connect the local agent from Settings and run one.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {commands.map((c) => (
          <CommandRow key={c.id} command={c} />
        ))}
      </div>
    </div>
  );
}

function CommandRow({ command }: { command: CommandAuditRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="cursor-pointer select-none" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center justify-between gap-4">
          <code className="truncate text-sm">{command.command}</code>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className={RISK_VARIANT[command.risk]}>
              {command.risk}
            </Badge>
            <Badge variant="outline">{command.decision.replace("_", " ")}</Badge>
            {command.exitCode !== null && (
              <Badge variant={command.exitCode === 0 ? "outline" : "destructive"}>
                exit {command.exitCode}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="flex items-center gap-3 text-xs">
          <span>{new Date(command.createdAt).toLocaleString()}</span>
          <span>{command.durationMs}ms</span>
          <span>{command.category}</span>
          <span>mode: {command.permissionMode}</span>
        </CardDescription>
      </CardHeader>
      {expanded && (
        <CardContent className="flex flex-col gap-3 text-xs">
          <p className="text-muted-foreground">{command.reason}</p>
          {command.editedFromCommand && (
            <p>
              <span className="text-muted-foreground">Edited from: </span>
              <code>{command.editedFromCommand}</code>
            </p>
          )}
          {command.stdoutPreview && (
            <div>
              <p className="mb-1 text-muted-foreground">stdout</p>
              <pre className="max-h-48 overflow-auto rounded-md border border-border bg-muted/30 p-2 font-mono whitespace-pre-wrap">
                {command.stdoutPreview}
              </pre>
            </div>
          )}
          {command.stderrPreview && (
            <div>
              <p className="mb-1 text-muted-foreground">stderr</p>
              <pre className="max-h-48 overflow-auto rounded-md border border-border bg-muted/30 p-2 font-mono whitespace-pre-wrap">
                {command.stderrPreview}
              </pre>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
