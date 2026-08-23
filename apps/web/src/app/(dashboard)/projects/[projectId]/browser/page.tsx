"use client";

import { use } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/lib/projects/use-project";

export default function BrowserPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project, loading } = useProject(projectId);

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="h-40" />
      </div>
    );
  }

  const target = project?.frontendUrl;

  return (
    <div className="p-6">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Browser smoke check</CardTitle>
          <CardDescription>
            Runs a real Playwright browser on your own machine — never inside this web app.
            Navigates to the URL and reports the actual HTTP status, page title, console errors,
            failed/4xx/5xx network requests, and a screenshot.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <code className="block w-fit rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs">
            ai-qa-agent browser-check {target ?? "<frontend-url>"}
          </code>
          {!target && (
            <p className="text-xs text-muted-foreground">
              No frontend URL set yet — add one in{" "}
              <Link href={`/projects/${projectId}/settings`} className="underline">
                Settings
              </Link>{" "}
              to have it filled in here automatically.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            See the{" "}
            <Link href={`/projects/${projectId}/runs`} className="underline">
              Runs
            </Link>{" "}
            page for results. Interactive form/button/navigation testing and a live in-dashboard
            browser view ship in Phase 5.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
