"use client";

import { use } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/lib/projects/use-project";

export default function ApiPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project, loading } = useProject(projectId);

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="h-40" />
      </div>
    );
  }

  const target = project?.backendUrl;

  return (
    <div className="p-6">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">API checks</CardTitle>
          <CardDescription>
            Runs on your own machine via the local agent — never inside this web app. It looks for
            an OpenAPI/Swagger spec at well-known locations, probes each discovered endpoint with a
            real HTTP request, and checks for standard security headers.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <code className="block w-fit rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs">
            ai-qa-agent api-check {target ?? "<backend-url>"}
          </code>
          {!target && (
            <p className="text-xs text-muted-foreground">
              No backend URL set yet — add one in{" "}
              <Link href={`/projects/${projectId}/settings`} className="underline">
                Settings
              </Link>{" "}
              to have it filled in here automatically.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Real status codes, response times, and header checks only — see the{" "}
            <Link href={`/projects/${projectId}/runs`} className="underline">
              Runs
            </Link>{" "}
            page for results. Deeper request validation (auth, malformed input, schema checks)
            ships in Phase 6.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
