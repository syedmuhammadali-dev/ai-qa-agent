"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { toMillis } from "@/lib/firebase/timestamps";
import type { NewProjectInput, Project } from "@/lib/projects/types";

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) return;
    const q = query(
      collection(db, "projects"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setProjects(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
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
            } satisfies Project;
          }),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [user]);

  async function createProject(input: NewProjectInput) {
    if (!db || !user) throw new Error("Not authenticated");
    // Firestore's client SDK rejects a literal `undefined` field value, so
    // optional fields left blank must be omitted entirely, not spread as
    // `undefined` — the same class of bug fixed for ai-config's baseUrl.
    await addDoc(collection(db, "projects"), {
      name: input.name,
      ...(input.githubRepoUrl ? { githubRepoUrl: input.githubRepoUrl } : {}),
      ...(input.frontendUrl ? { frontendUrl: input.frontendUrl } : {}),
      ...(input.backendUrl ? { backendUrl: input.backendUrl } : {}),
      ownerId: user.uid,
      status: "not_configured",
      permissionMode: "manual",
      evidenceUploadEnabled: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async function removeProject(projectId: string) {
    if (!db) throw new Error("Not authenticated");
    await deleteDoc(doc(db, "projects", projectId));
  }

  return { projects, loading, createProject, removeProject };
}
