"use client";

import { use } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/lib/projects/use-project";
import { ExecutionPipeline } from "@/components/layout/execution-pipeline";

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
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate font-mono text-xs text-foreground underline-offset-2 hover:text-primary hover:underline"
                >
                  {value}
                </a>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Execution pipeline</CardTitle>
          <CardDescription>
            Real state only — a step lights up when there&apos;s actual evidence for it (a connected
            repo, a live local-agent session, a command of that category having run). See{" "}
            <Button
              render={<Link href={`/projects/${projectId}/runs`} />}
              variant="link"
              size="sm"
              className="h-auto p-0"
            >
              Runs
            </Button>{" "}
            for the live output.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExecutionPipeline projectId={projectId} project={project} />
        </CardContent>
      </Card>
    </div>
  );
}
