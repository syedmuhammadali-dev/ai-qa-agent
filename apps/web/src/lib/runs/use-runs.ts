"use client";

import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { RunRecord } from "@ai-qa-agent/agent-core";
import { db } from "@/lib/firebase/client";

export function useRuns(projectId: string) {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !projectId) return;
    const q = query(collection(db, "projects", projectId, "runs"), orderBy("startedAt", "desc"), limit(50));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setRuns(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              command: data.command,
              category: data.category,
              status: data.status,
              startedAt: data.startedAt,
              finishedAt: data.finishedAt,
              exitCode: data.exitCode,
              log: data.log ?? "",
            } satisfies RunRecord;
          })
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [projectId]);

  return { runs, loading };
}
