"use client";

import Link from "next/link";
import { Trash2, FolderGit2 } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
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

const statusColor: Record<ProjectStatus, string> = {
  not_configured: "text-muted-foreground border-muted-foreground/30",
  ready: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  running: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  error: "text-red-400 border-red-400/30 bg-red-400/10",
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.25 } },
};

export default function DashboardPage() {
  const { projects, loading, createProject, removeProject } = useProjects();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect a repository and start an autonomous QA audit.
          </p>
        </div>
        {/* Only show top button when projects exist */}
        {!loading && projects.length > 0 && <NewProjectDialog createProject={createProject} />}
      </motion.div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && projects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="gradient-trail-border flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 py-20 text-center gap-5"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/50 bg-background/80 shadow-lg">
            <FolderGit2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">No projects yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Create a project to start an autonomous QA audit of your repository.
            </p>
          </div>
          <NewProjectDialog createProject={createProject} />
        </motion.div>
      )}

      {/* Project Grid */}
      {!loading && projects.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                variants={cardVariants}
                exit="exit"
                layout
                className="group relative rounded-xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5"
              >
                <Link href={`/projects/${project.id}/overview`} className="absolute inset-0 rounded-xl" aria-label={project.name} />
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{project.name}</h3>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${statusColor[project.status]}`}
                  >
                    {statusLabel[project.status]}
                  </Badge>
                </div>
                {project.githubRepoUrl && (
                  <a
                    href={project.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-10 block w-fit max-w-full truncate text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline mb-4"
                  >
                    {project.githubRepoUrl}
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    removeProject(project.id);
                  }}
                  title="Delete project"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

