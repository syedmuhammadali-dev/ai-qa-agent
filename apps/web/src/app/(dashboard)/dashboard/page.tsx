"use client";

import Link from "next/link";
import { Trash2, FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NewProjectDialog } from "@/components/layout/new-project-dialog";
import { useProjects } from "@/lib/projects/use-projects";
import type { ProjectStatus } from "@/lib/projects/types";

const statusLabel: Record<ProjectStatus, string> = {
  not_configured: "Not configured",
  ready: "Ready",
  running: "Running",
  error: "Error",
};

export default function DashboardPage() {
  const { projects, loading, removeProject } = useProjects();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Connect a repository and start an autonomous QA audit.
          </p>
        </div>
        <NewProjectDialog />
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {!loading && projects.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FolderGit2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No projects yet. Create one to start an audit.
            </p>
            <NewProjectDialog />
          </CardContent>
        </Card>
      )}

      {!loading && projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="group relative">
              <Link href={`/projects/${project.id}/overview`} className="absolute inset-0" aria-label={project.name} />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <Badge variant="outline">{statusLabel[project.status]}</Badge>
                </div>
                {project.githubRepoUrl && (
                  <CardDescription className="truncate">{project.githubRepoUrl}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    removeProject(project.id);
                  }}
                  title="Delete project"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
