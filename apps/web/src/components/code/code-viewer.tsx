"use client";

import Editor from "@monaco-editor/react";

const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  md: "markdown",
  css: "css",
  scss: "scss",
  html: "html",
  yml: "yaml",
  yaml: "yaml",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  rb: "ruby",
  php: "php",
  sql: "sql",
  sh: "shell",
  prisma: "graphql",
  toml: "ini",
  dockerfile: "dockerfile",
};

function languageForPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  if (base.toLowerCase() === "dockerfile") return "dockerfile";
  const ext = base.includes(".") ? base.split(".").pop()!.toLowerCase() : "";
  return EXT_TO_LANGUAGE[ext] ?? "plaintext";
}

export function CodeViewer({
  path,
  content,
  highlightLine,
  height = "24rem",
}: {
  path: string;
  content: string;
  highlightLine?: number;
  height?: string;
}) {
  return (
    <Editor
      height={height}
      path={path}
      language={languageForPath(path)}
      value={content}
      theme="vs-dark"
      options={{
        readOnly: true,
        domReadOnly: true,
        minimap: { enabled: false },
        fontSize: 12,
        scrollBeyondLastLine: false,
        wordWrap: "on",
      }}
      onMount={(editor, monaco) => {
        if (highlightLine) {
          editor.revealLineInCenter(highlightLine);
          editor.deltaDecorations(
            [],
            [
              {
                range: new monaco.Range(highlightLine, 1, highlightLine, 1),
                options: { isWholeLine: true, className: "monaco-highlight-line" },
              },
            ]
          );
        }
      }}
    />
  );
}
