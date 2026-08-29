"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import type { CheckStatus } from "@ai-qa-agent/report-generator";
import { db } from "@/lib/firebase/client";

export interface ReportSnapshot {
  id: string;
  overallScore: number | null;
  overallStatus: CheckStatus;
  generatedAt: number;
}

const MAX_SNAPSHOTS = 30;

/** Live history of real report generations for one project — written
 * server-side by GET /report each time someone actually generates a report,
 * never fabricated or interpolated. */
export function useReportHistory(projectId: string) {
  const [history, setHistory] = useState<ReportSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !projectId) return;
    const firestore = db;
    const q = query(
      collection(firestore, "projects", projectId, "reportSnapshots"),
      orderBy("generatedAt", "desc"),
      limit(MAX_SNAPSHOTS),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              overallScore: data.overallScore ?? null,
              overallStatus: data.overallStatus,
              generatedAt: data.generatedAt,
            } satisfies ReportSnapshot;
          })
          .reverse(); // oldest first, for a left-to-right trend line
        setHistory(docs);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [projectId]);

  return { history, loading };
}
