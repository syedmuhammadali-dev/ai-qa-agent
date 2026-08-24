"use client";

import { use, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, History, Sparkles, Terminal as TerminalIcon, Wrench, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { XtermView } from "@/components/terminal/xterm-view";
import { FixDiffViewer } from "@/components/code/fix-diff-viewer";
import { EvidenceGallery } from "@/components/layout/evidence-gallery";
import { useAuth } from "@/lib/auth/auth-context";
import { useCommands } from "@/lib/commands/use-commands";
import { useRuns } from "@/lib/runs/use-runs";
import type { CommandAuditRecord, FixProposal, RunRecord } from "@ai-qa-agent/agent-core";

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
              <RunCard key={run.id} projectId={projectId} run={run} defaultOpen={i === 0} />
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

function RunCard({ projectId, run, defaultOpen }: { projectId: string; run: RunRecord; defaultOpen: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const { user } = useAuth();
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState(run.diagnosis);
  const [proposingFix, setProposingFix] = useState(false);
  const [fix, setFix] = useState(run.fix);

  async function handleDiagnose() {
    if (!user) return;
    setDiagnosing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/projects/${projectId}/runs/${run.id}/diagnose`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Diagnosis failed");
      setDiagnosis(data.diagnosis);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Diagnosis failed");
    } finally {
      setDiagnosing(false);
    }
  }

  async function handleProposeFix() {
    if (!user) return;
    setProposingFix(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/projects/${projectId}/runs/${run.id}/propose-fix`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fix proposal failed");
      setFix(data.fix);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fix proposal failed");
    } finally {
      setProposingFix(false);
    }
  }

  async function handleFixDecision(decision: "approved" | "rejected") {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/projects/${projectId}/runs/${run.id}/fix-decision`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to record decision");
      setFix((prev) => (prev ? { ...prev, status: decision } : prev));
      toast.success(decision === "approved" ? "Approved — run `ai-qa-agent apply-fixes` to apply it" : "Rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record decision");
    }
  }

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
        <CardContent className="flex flex-col gap-3">
          <XtermView log={run.log} className="h-64 w-full rounded-md border border-border bg-black/90 p-1" />
          {run.evidencePaths && run.evidencePaths.length > 0 && <EvidenceGallery paths={run.evidencePaths} />}
          {run.status === "failed" && (
            <div className="flex flex-col gap-2">
              {!diagnosis && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDiagnose();
                  }}
                  disabled={diagnosing}
                >
                  <Sparkles className="h-4 w-4" />
                  {diagnosing ? "Diagnosing..." : "Diagnose with AI"}
                </Button>
              )}
              {diagnosis && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <p className="mb-1 text-xs text-muted-foreground">
                    {diagnosis.model} — {new Date(diagnosis.generatedAt).toLocaleString()}
                  </p>
                  <p className="whitespace-pre-wrap">{diagnosis.summary}</p>
                </div>
              )}
              {diagnosis && !fix && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProposeFix();
                  }}
                  disabled={proposingFix}
                >
                  <Wrench className="h-4 w-4" />
                  {proposingFix ? "Proposing fix..." : "Propose Fix"}
                </Button>
              )}
              {fix && <FixSection fix={fix} onDecision={handleFixDecision} />}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

const FIX_SAFETY_VARIANT: Record<FixProposal["safety"], string> = {
  SAFE: "text-emerald-500 border-emerald-500/40",
  REVIEW_REQUIRED: "text-amber-500 border-amber-500/40",
  DANGEROUS: "text-red-500 border-red-500/40",
};

function FixSection({ fix, onDecision }: { fix: FixProposal; onDecision: (decision: "approved" | "rejected") => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <code className="text-xs">{fix.filePath}</code>
          <Badge variant="outline" className={FIX_SAFETY_VARIANT[fix.safety]}>
            {fix.safety.replace("_", " ")}
          </Badge>
          <Badge variant="outline">{fix.status}</Badge>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{fix.explanation}</p>

      {fix.safety === "DANGEROUS" ? (
        <p className="text-xs text-red-500">
          Classified DANGEROUS — this pipeline never allows applying it. Review and fix manually.
        </p>
      ) : (
        <>
          <FixDiffViewer path={fix.filePath} original={fix.originalContent} modified={fix.patchedContent} />
          {fix.status === "proposed" && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onDecision("approved")}>
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDecision("rejected")}>
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </div>
          )}
          {fix.status === "approved" && (
            <p className="text-xs text-emerald-500">
              Approved — run <code>ai-qa-agent apply-fixes</code> locally to apply it and run the regression suite.
            </p>
          )}
          {fix.status === "applied" && <p className="text-xs text-emerald-500">Applied — regression suite passed.</p>}
          {fix.status === "regression_failed" && (
            <p className="text-xs text-red-500">Applied, but the regression suite failed afterward — review needed.</p>
          )}
        </>
      )}
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
