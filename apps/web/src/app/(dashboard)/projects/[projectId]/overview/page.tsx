"use client";

import { use } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/lib/projects/use-project";

export default function OverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project, loading } = useProject(projectId);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (!project) {
    return <div className="p-6 text-sm text-muted-foreground">Project not found.</div>;
  }

  const connections = [
    { label: "GitHub repository", value: project.githubRepoUrl },
    { label: "Frontend URL", value: project.frontendUrl },
    { label: "Backend/API URL", value: project.backendUrl },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Connections</CardTitle>
            <Badge variant="outline">{project.status}</Badge>
          </div>
          <CardDescription>
            What this project is wired up to. Missing connections limit which audits can run.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {connections.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
              <span className="text-muted-foreground">{label}</span>
              {value ? (
                <span className="truncate font-mono text-xs">{value}</span>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Not set
                </Badge>
              )}
            </div>
          ))}
          <div className="pt-2">
            <Button render={<Link href={`/projects/${projectId}/settings`} />} variant="outline" size="sm">
              Edit connections
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Run an audit</CardTitle>
          <CardDescription>
            The QA engine (framework detection, test execution, browser testing) ships in Phase 4.
            Once the local agent (Phase 3) is connected, audits will run for real here — no
            simulated results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled>Run Audit (coming soon)</Button>
        </CardContent>
      </Card>
    </div>
  );
}
