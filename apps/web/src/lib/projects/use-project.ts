"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { toMillis } from "@/lib/firebase/timestamps";
import type { Project } from "@/lib/projects/types";

export function useProject(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !projectId) return;
    const unsubscribe = onSnapshot(
      doc(db, "projects", projectId),
      (snap) => {
        if (!snap.exists()) {
          setProject(null);
        } else {
          const data = snap.data();
          setProject({
            id: snap.id,
            name: data.name,
            ownerId: data.ownerId,
            githubRepoUrl: data.githubRepoUrl,
            frontendUrl: data.frontendUrl,
            backendUrl: data.backendUrl,
            status: data.status ?? "not_configured",
            permissionMode: data.permissionMode ?? "manual",
            evidenceUploadEnabled: data.evidenceUploadEnabled ?? false,
            createdAt: toMillis(data.createdAt),
            updatedAt: toMillis(data.updatedAt),
          });
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [projectId]);

  return { project, loading };
}
