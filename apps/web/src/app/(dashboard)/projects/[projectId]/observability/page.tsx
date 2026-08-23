"use client";

import { use } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/lib/projects/use-project";
import { useAnalysis } from "@/lib/analysis/use-analysis";

export default function ObservabilityPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project, loading: projectLoading } = useProject(projectId);
  const { analysis, loading, error, analyze } = useAnalysis(projectId);

  if (projectLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!project?.githubRepoUrl) {
    return (
      <div className="p-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Connect a GitHub repository first to check for observability tooling.
            </p>
            <Button
              render={<Link href={`/projects/${projectId}/github`} />}
              variant="outline"
              size="sm"
            >
              Connect GitHub
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Observability</CardTitle>
            <Button variant="outline" size="sm" onClick={analyze} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
              {analysis ? "Re-analyze" : "Analyze repository"}
            </Button>
          </div>
          <CardDescription>
            Detects Sentry and OpenTelemetry from real dependencies — read directly from the
            repository via the GitHub API, no cloning. Sentry is observability, not a testing
            framework; if nothing is detected, that&apos;s reported as a real gap, not skipped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <Skeleton className="h-24" />}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && analysis && (
            <div className="flex flex-col gap-3">
              {analysis.observability.length === 0 ? (
                <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">No observability tooling detected</p>
                    <p className="text-xs text-muted-foreground">
                      No Sentry or OpenTelemetry dependency was found. Errors and performance
                      regressions in production would have no automatic visibility.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.observability.map((tool) => (
                      <Badge key={tool} variant="outline">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!loading && !analysis && !error && (
            <p className="text-sm text-muted-foreground">Not analyzed yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
