"use client";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
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
  // Firestore's local cache excludes a doc from an `orderBy(field)` query's
  // snapshot until the server acknowledges the write, whenever that field
  // was written via serverTimestamp() — so a freshly created project can
  // take a real network round-trip to appear via onSnapshot alone. Track it
  // here optimistically and drop it once the real snapshot includes it.
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);

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
        const docs = snapshot.docs.map((d) => {
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
        });
        setProjects(docs);
        setPendingProjects((prev) => prev.filter((p) => !docs.some((d) => d.id === p.id)));
        setLoading(false);
      },
      (err) => {
        console.error("useProjects onSnapshot error:", err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [user]);

  async function createProject(input: NewProjectInput) {
    if (!db || !user) throw new Error("Not authenticated");
    const ref = doc(collection(db, "projects"));
    const now = Date.now();
    setPendingProjects((prev) => [
      {
        id: ref.id,
        name: input.name,
        ownerId: user.uid,
        githubRepoUrl: input.githubRepoUrl,
        frontendUrl: input.frontendUrl,
        backendUrl: input.backendUrl,
        status: "not_configured",
        permissionMode: "manual",
        evidenceUploadEnabled: false,
        createdAt: now,
        updatedAt: now,
      },
      ...prev,
    ]);
    try {
      // Firestore's client SDK rejects a literal `undefined` field value, so
      // optional fields left blank must be omitted entirely, not spread as
      // `undefined` — the same class of bug fixed for ai-config's baseUrl.
      await setDoc(ref, {
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
    } catch (err) {
      setPendingProjects((prev) => prev.filter((p) => p.id !== ref.id));
      throw err;
    }
  }

  async function removeProject(projectId: string) {
    if (!db) throw new Error("Not authenticated");
    setPendingProjects((prev) => prev.filter((p) => p.id !== projectId));
    await deleteDoc(doc(db, "projects", projectId));
  }

  const combined = pendingProjects.length > 0 ? [...pendingProjects, ...projects] : projects;

  return { projects: combined, loading, createProject, removeProject };
}
