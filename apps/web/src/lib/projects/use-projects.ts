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
  Timestamp,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/auth-context";
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
      orderBy("createdAt", "desc")
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
              createdAt: toMillis(data.createdAt),
              updatedAt: toMillis(data.updatedAt),
            } satisfies Project;
          })
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [user]);

  async function createProject(input: NewProjectInput) {
    if (!db || !user) throw new Error("Not authenticated");
    await addDoc(collection(db, "projects"), {
      ...input,
      ownerId: user.uid,
      status: "not_configured",
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

function toMillis(value: Timestamp | undefined): number {
  return value ? value.toMillis() : Date.now();
}
