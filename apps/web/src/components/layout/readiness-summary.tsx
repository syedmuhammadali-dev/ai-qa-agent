"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Ban, CheckCircle2, CircleDashed, ListChecks, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useReport } from "@/lib/reports/use-report";
import { ScoreTrendChart } from "@/components/layout/score-trend-chart";
import type { CheckStatus } from "@ai-qa-agent/report-generator";

/** Fixed status palette — never themed, never reused for series identity.
 * Values match the design system's reserved status hexes (good/warning/
 * serious/critical), mode-invariant since this app is dark-only. */
const STATUS_COLOR: Record<CheckStatus, string> = {
  PASS: "#0ca30c",
  REQUIRES_HUMAN_REVIEW: "#fab219",
  FAIL: "#ec835a",
  BLOCKED: "#d03b3b",
  NOT_RUN: "#5b5a56",
  SKIPPED: "#5b5a56",
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  PASS: "Passing",
  FAIL: "Failing",
  BLOCKED: "Blocked",
  REQUIRES_HUMAN_REVIEW: "Needs review",
  NOT_RUN: "Not run",
  SKIPPED: "Skipped",
};

/** Status is never color-alone — every use pairs the color with this icon + the label. */
const STATUS_ICON: Record<CheckStatus, typeof CheckCircle2> = {
  PASS: CheckCircle2,
  FAIL: XCircle,
  BLOCKED: Ban,
  REQUIRES_HUMAN_REVIEW: AlertTriangle,
  NOT_RUN: CircleDashed,
  SKIPPED: CircleDashed,
};

const METER_COLOR = (status: CheckStatus) =>
  status === "PASS" ? STATUS_COLOR.PASS : status === "FAIL" || status === "BLOCKED" ? STATUS_COLOR.BLOCKED : STATUS_COLOR.REQUIRES_HUMAN_REVIEW;

export function ReadinessSummary({ projectId }: { projectId: string }) {
  const { report, loading, generate } = useReport(projectId);

  useEffect(() => {
    generate();
  }, [generate]);

  const statusOrder: CheckStatus[] = ["PASS", "REQUIRES_HUMAN_REVIEW", "FAIL", "BLOCKED", "NOT_RUN", "SKIPPED"];

  const counts = report
    ? statusOrder
        .map((status) => ({
          status,
          count: report.categories.filter((c) => c.status === status).length,
        }))
        .filter((s) => s.count > 0)
    : [];

  const total = report?.categories.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Readiness</CardTitle>
          <Link href={`/projects/${projectId}/findings`} className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline">
            Full report
          </Link>
        </div>
        <CardDescription>
          Computed from real execution evidence — a category never counted until it actually runs.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {loading && <Skeleton className="h-20" />}

        {!loading && !report && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <ListChecks className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No report generated yet.</p>
          </div>
        )}

        {!loading && report && (
          <>
            {/* Meter: overall score against the 0-100 limit */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Overall score</span>
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="tabular-nums">
                    {report.overallScore === null ? "N/A" : `${report.overallScore.toFixed(0)} / 100`}
                  </span>
                  {(() => {
                    const Icon = STATUS_ICON[report.overallStatus];
                    return <Icon className="h-3.5 w-3.5" style={{ color: METER_COLOR(report.overallStatus) }} />;
                  })()}
                  <span className="text-xs font-normal text-muted-foreground">
                    {STATUS_LABEL[report.overallStatus]}
                  </span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                {report.overallScore !== null && (
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${report.overallScore}%`,
                      backgroundColor: METER_COLOR(report.overallStatus),
                    }}
                  />
                )}
              </div>
            </div>

            <ScoreTrendChart projectId={projectId} />

            {/* Part-to-whole: category count by status */}
            {total > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">
                  {total} {total === 1 ? "category" : "categories"} tracked
                </span>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary" role="img" aria-label={`${total} categories: ${counts.map((s) => `${s.count} ${STATUS_LABEL[s.status]}`).join(", ")}`}>
                  {counts.map((s, i) => (
                    <Tooltip key={s.status}>
                      <TooltipTrigger
                        render={
                          <div
                            className="h-full first:rounded-l-full last:rounded-r-full"
                            style={{
                              width: `${(s.count / total) * 100}%`,
                              backgroundColor: STATUS_COLOR[s.status],
                              marginLeft: i === 0 ? 0 : "2px",
                            }}
                          />
                        }
                      />
                      <TooltipContent className="flex items-center gap-1.5">
                        {(() => {
                          const Icon = STATUS_ICON[s.status];
                          return <Icon className="h-3 w-3" />;
                        })()}
                        {s.count} {STATUS_LABEL[s.status]}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {counts.map((s) => {
                    const Icon = STATUS_ICON[s.status];
                    return (
                      <span key={s.status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon className="h-3 w-3 shrink-0" style={{ color: STATUS_COLOR[s.status] }} />
                        {STATUS_LABEL[s.status]} ({s.count})
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
