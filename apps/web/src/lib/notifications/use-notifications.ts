"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import type { RunRecord } from "@ai-qa-agent/agent-core";
import { db } from "@/lib/firebase/client";
import { useProjects } from "@/lib/projects/use-projects";

export interface NotificationItem {
  id: string;
  projectId: string;
  projectName: string;
  kind: "run" | "fix" | "release";
  /** Whether this event is good news or bad — drives icon/color, since
   * "Run completed" and "Run failed" share a kind but must never look alike. */
  tone: "good" | "bad" | "neutral";
  title: string;
  detail: string;
  timestamp: number;
  href: string;
}

/** How many of the user's most-recently-created projects get a live listener.
 * A real per-project onSnapshot listener, not a fan-out that grows unbounded
 * with account age — reasonable for how many projects a user actively works
 * across at once. */
const MAX_PROJECTS_WATCHED = 10;
const MAX_ITEMS = 20;

/** Derives notification-worthy events live from each watched project's real
 * `runs` collection — a run finishing, a fix being proposed, a release being
 * pushed — rather than a separate notifications collection that could drift
 * from the actual state. No new backend, no new security rules. */
export function useNotifications(): NotificationItem[] {
  const { projects } = useProjects();
  const [runsByProject, setRunsByProject] = useState<Record<string, RunRecord[]>>({});
  const projectIds = projects
    .slice(0, MAX_PROJECTS_WATCHED)
    .map((p) => p.id)
    .join(",");

  useEffect(() => {
    if (!db || !projectIds) return;
    const firestore = db;
    const watched = projects.filter((p) => projectIds.includes(p.id)).slice(0, MAX_PROJECTS_WATCHED);
    const unsubscribers = watched.map((project) => {
      const q = query(collection(firestore, "projects", project.id, "runs"), orderBy("startedAt", "desc"), limit(10));
      return onSnapshot(
        q,
        (snapshot) => {
          const runs = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              command: data.command,
              category: data.category,
              status: data.status,
              startedAt: data.startedAt,
              finishedAt: data.finishedAt ?? null,
              exitCode: data.exitCode,
              log: "",
              fix: data.fix,
              release: data.release,
            } as RunRecord;
          });
          setRunsByProject((prev) => ({ ...prev, [project.id]: runs }));
        },
        () => setRunsByProject((prev) => ({ ...prev, [project.id]: [] })),
      );
    });
    return () => unsubscribers.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIds]);

  const items: NotificationItem[] = [];
  for (const project of projects) {
    for (const run of runsByProject[project.id] ?? []) {
      if (run.status !== "running" && run.finishedAt) {
        items.push({
          id: `${project.id}-${run.id}-run`,
          projectId: project.id,
          projectName: project.name,
          kind: "run",
          tone: run.status === "completed" ? "good" : "bad",
          title: run.status === "completed" ? "Run completed" : "Run failed",
          detail: run.command,
          timestamp: run.finishedAt,
          href: `/projects/${project.id}/runs`,
        });
      }
      if (run.fix?.status === "proposed") {
        items.push({
          id: `${project.id}-${run.id}-fix`,
          projectId: project.id,
          projectName: project.name,
          kind: "fix",
          tone: "neutral",
          title: "Fix proposed",
          detail: run.fix.filePath,
          timestamp: run.fix.createdAt,
          href: `/projects/${project.id}/runs`,
        });
      }
      if (run.release?.status === "pushed") {
        items.push({
          id: `${project.id}-${run.id}-release`,
          projectId: project.id,
          projectName: project.name,
          kind: "release",
          tone: "good",
          title: "Release pushed",
          detail: run.release.branchName,
          timestamp: run.release.pushedAt ?? run.release.decidedAt ?? run.release.createdAt,
          href: `/projects/${project.id}/runs`,
        });
      }
    }
  }
  items.sort((a, b) => b.timestamp - a.timestamp);
  return items.slice(0, MAX_ITEMS);
}
