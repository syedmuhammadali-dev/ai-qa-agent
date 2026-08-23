"use client";

import { collection, limit, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { CommandAuditRecord } from "@ai-qa-agent/agent-core";
import { db } from "@/lib/firebase/client";

export function useCommands(projectId: string) {
  const [commands, setCommands] = useState<CommandAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !projectId) return;
    const q = query(
      collection(db, "projects", projectId, "commands"),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setCommands(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              command: data.command,
              reason: data.reason,
              risk: data.risk,
              category: data.category,
              decision: data.decision,
              permissionMode: data.permissionMode,
              approved: data.approved,
              editedFromCommand: data.editedFromCommand ?? undefined,
              exitCode: data.exitCode,
              durationMs: data.durationMs,
              outputHash: data.outputHash,
              stdoutPreview: data.stdoutPreview,
              stderrPreview: data.stderrPreview,
              createdAt: toMillis(data.createdAt),
            } satisfies CommandAuditRecord;
          })
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [projectId]);

  return { commands, loading };
}

function toMillis(value: Timestamp | number | undefined): number {
  if (typeof value === "number") return value;
  return value ? value.toMillis() : Date.now();
}
