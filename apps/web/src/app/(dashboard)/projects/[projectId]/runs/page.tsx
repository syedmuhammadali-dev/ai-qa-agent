"use client";

import { use, useState } from "react";
import { History, Terminal as TerminalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { XtermView } from "@/components/terminal/xterm-view";
import { useCommands } from "@/lib/commands/use-commands";
import { useRuns } from "@/lib/runs/use-runs";
import type { CommandAuditRecord, RunRecord } from "@ai-qa-agent/agent-core";

const RISK_VARIANT: Record<string, string> = {
  read: "text-muted-foreground",
  low: "text-muted-foreground",
  medium: "text-amber-500",
  high: "text-orange-500",
  critical: "text-red-500",
  blocked: "text-red-600",
};

const STATUS_VARIANT: Record<RunRecord["status"], string> = {
  running: "text-blue-500",
  completed: "text-emerald-500",
  failed: "text-red-500",
};

export default function RunsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { commands, loading: commandsLoading } = useCommands(projectId);
  const { runs, loading: runsLoading } = useRuns(projectId);

  return (
    <div className="p-6">
      <Tabs defaultValue="terminal">
        <TabsList>
          <TabsTrigger value="terminal">Terminal</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="terminal">
          <div className="flex flex-col gap-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Real command output, streamed live from the local agent while a command executes.
              Nothing here is simulated — this is the actual stdout/stderr as it happened.
            </p>
            {runsLoading && <Skeleton className="h-40" />}
            {!runsLoading && runs.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <TerminalIcon className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No runs yet. Connect the local agent from Settings and run something.
                  </p>
                </CardContent>
              </Card>
            )}
            {runs.map((run, i) => (
              <RunCard key={run.id} run={run} defaultOpen={i === 0} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <div className="flex flex-col gap-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Every command the local agent attempted, including ones that were blocked or denied
              before ever running — with real risk classification and permission decision.
            </p>
            {commandsLoading && (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            )}
            {!commandsLoading && commands.length === 0 && (
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RunCard({ run, defaultOpen }: { run: RunRecord; defaultOpen: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);

  return (
    <Card>
      <CardHeader className="cursor-pointer select-none" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center justify-between gap-4">
          <code className="truncate text-sm">{run.command}</code>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className={STATUS_VARIANT[run.status]}>
              {run.status}
            </Badge>
            {run.exitCode !== null && (
              <Badge variant={run.exitCode === 0 ? "outline" : "destructive"}>exit {run.exitCode}</Badge>
            )}
          </div>
        </div>
        <CardDescription className="flex items-center gap-3 text-xs">
          <span>{new Date(run.startedAt).toLocaleString()}</span>
          <span>{run.category}</span>
          {run.finishedAt && <span>{run.finishedAt - run.startedAt}ms</span>}
        </CardDescription>
      </CardHeader>
      {expanded && (
        <CardContent>
          <XtermView log={run.log} className="h-64 w-full rounded-md border border-border bg-black/90 p-1" />
        </CardContent>
      )}
    </Card>
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
