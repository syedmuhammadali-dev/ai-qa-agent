"use client";

import { DiffEditor } from "@monaco-editor/react";

export function FixDiffViewer({
  path,
  original,
  modified,
  height = "20rem",
}: {
  path: string;
  original: string;
  modified: string;
  height?: string;
}) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const language =
    { ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript", json: "json", css: "css", md: "markdown" }[ext] ??
    "plaintext";

  return (
    <DiffEditor
      height={height}
      language={language}
      original={original}
      modified={modified}
      theme="vs-dark"
      options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, renderSideBySide: true }}
    />
  );
}
