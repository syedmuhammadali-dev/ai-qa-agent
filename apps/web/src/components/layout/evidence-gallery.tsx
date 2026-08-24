"use client";

import { useEffect, useState } from "react";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

export function EvidenceGallery({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!storage) return;
    let cancelled = false;
    for (const path of paths) {
      getDownloadURL(ref(storage, path))
        .then((url) => {
          if (!cancelled) setUrls((prev) => ({ ...prev, [path]: url }));
        })
        .catch(() => {
          // Not fatal — evidence upload is best-effort; just skip a broken/missing file.
        });
    }
    return () => {
      cancelled = true;
    };
  }, [paths]);

  if (paths.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {paths.map((path) => {
        const url = urls[path];
        const name = path.split("/").pop();
        return url ? (
          <a key={path} href={url} target="_blank" rel="noreferrer" title={name}>
            {/* eslint-disable-next-line @next/next/no-img-element -- external Storage URL, not a local/optimizable asset */}
            <img src={url} alt={name ?? "evidence"} className="h-24 w-auto rounded-md border border-border object-cover" />
          </a>
        ) : (
          <div key={path} className="h-24 w-24 animate-pulse rounded-md border border-border bg-muted/30" />
        );
      })}
    </div>
  );
}
