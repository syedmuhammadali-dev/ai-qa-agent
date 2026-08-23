"use client";

import { use } from "react";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { useProject } from "@/lib/projects/use-project";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { project, loading } = useProject(projectId);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <ProjectSidebar projectId={projectId} />
      <div className="flex-1 overflow-auto">
        <div className="border-b border-border px-6 py-3">
          {loading ? (
            <Skeleton className="h-6 w-48" />
          ) : (
            <h1 className="text-base font-semibold tracking-tight">
              {project?.name ?? "Unknown project"}
            </h1>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
