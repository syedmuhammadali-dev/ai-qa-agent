"use client";

import { use, useEffect } from "react";
import { toast } from "sonner";
import { Download, FileText, ListChecks, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReport } from "@/lib/reports/use-report";
import type { CheckStatus } from "@ai-qa-agent/report-generator";

const STATUS_VARIANT: Record<CheckStatus, string> = {
  PASS: "text-emerald-500 border-emerald-500/40",
  FAIL: "text-red-500 border-red-500/40",
  BLOCKED: "text-red-600 border-red-600/40",
  NOT_RUN: "text-muted-foreground",
  SKIPPED: "text-muted-foreground",
  REQUIRES_HUMAN_REVIEW: "text-amber-500 border-amber-500/40",
};

export default function FindingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { report, loading, error, generate, download } = useReport(projectId);

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleDownload(format: "markdown" | "html") {
    try {
      await download(format);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Production Readiness Report</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
                <RefreshCw className="h-4 w-4" />
                {report ? "Refresh" : "Generate"}
              </Button>
              {report && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleDownload("markdown")}>
                    <Download className="h-4 w-4" />
                    Markdown
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDownload("html")}>
                    <FileText className="h-4 w-4" />
                    HTML
                  </Button>
                </>
              )}
            </div>
          </div>
          <CardDescription>
            Every category below reflects real execution evidence from this project&apos;s command
            audit log and run history — a category that has never been run is marked NOT RUN, never
            PASS, and never counts toward the score.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loading && <Skeleton className="h-40" />}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {!loading && report && (
            <>
              <div className="flex items-center gap-4 rounded-md border border-border p-4">
                <div className="flex flex-col">
                  <span className="text-3xl font-bold">
                    {report.overallScore === null ? "N/A" : report.overallScore.toFixed(1)}
                    {report.overallScore !== null && (
                      <span className="text-base font-normal text-muted-foreground"> / 100</span>
                    )}
                  </span>
                  <Badge variant="outline" className={`w-fit ${STATUS_VARIANT[report.overallStatus]}`}>
                    {report.overallStatus.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{report.scoreFormula}</p>
              </div>

              <div className="flex flex-col gap-2">
                {report.categories.map((c) => (
                  <div key={c.category} className="flex flex-col gap-1 rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.category}</span>
                      <div className="flex items-center gap-2">
                        {c.countedInScore && (
                          <span className="text-xs text-muted-foreground">
                            {c.score.toFixed(0)} × {c.weight}
                          </span>
                        )}
                        <Badge variant="outline" className={STATUS_VARIANT[c.status]}>
                          {c.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.details}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && !report && !error && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <ListChecks className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No report generated yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
