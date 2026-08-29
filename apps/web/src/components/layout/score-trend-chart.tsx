"use client";

import { useId, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useReportHistory } from "@/lib/reports/use-report-history";

const WIDTH = 400;
const HEIGHT = 72;
const PAD_X = 8;
const PAD_Y = 10;

export function ScoreTrendChart({ projectId }: { projectId: string }) {
  const { history, loading } = useReportHistory(projectId);
  const gradientId = useId();

  const points = useMemo(
    () => history.filter((h): h is typeof h & { overallScore: number } => h.overallScore !== null),
    [history],
  );

  if (loading || points.length < 2) return null;

  const innerW = WIDTH - PAD_X * 2;
  const innerH = HEIGHT - PAD_Y * 2;
  const xAt = (i: number) => PAD_X + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yAt = (score: number) => PAD_Y + innerH - (score / 100) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.overallScore).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xAt(points.length - 1).toFixed(1)},${(PAD_Y + innerH).toFixed(1)} L${xAt(0).toFixed(1)},${(PAD_Y + innerH).toFixed(1)} Z`;
  const last = points[points.length - 1];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">Score trend</span>
        <span className="text-xs text-muted-foreground">
          last {points.length} {points.length === 1 ? "run" : "runs"}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-16 w-full overflow-visible"
        role="img"
        aria-label={`Readiness score trend across ${points.length} data points, latest score ${last.overallScore}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={PAD_X} y1={PAD_Y + innerH} x2={WIDTH - PAD_X} y2={PAD_Y + innerH} stroke="var(--border)" strokeWidth="1" />
        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <Tooltip key={p.id}>
            <TooltipTrigger
              render={
                <g>
                  {/* Visible mark */}
                  <circle
                    cx={xAt(i)}
                    cy={yAt(p.overallScore)}
                    r={i === points.length - 1 ? 4 : 3}
                    fill="var(--primary)"
                    stroke="var(--card)"
                    strokeWidth="2"
                  />
                  {/* Larger transparent hit target, per the hover-target rule */}
                  <circle cx={xAt(i)} cy={yAt(p.overallScore)} r={12} fill="transparent" className="cursor-default" />
                </g>
              }
            />
            <TooltipContent>
              {p.overallScore}/100 — {new Date(p.generatedAt).toLocaleString()}
            </TooltipContent>
          </Tooltip>
        ))}
      </svg>
    </div>
  );
}
