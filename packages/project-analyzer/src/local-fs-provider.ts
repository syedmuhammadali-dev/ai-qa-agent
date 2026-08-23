import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import type { FileProvider } from "./types.ts";

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".ai-qa",
  "dist",
  "build",
  "out",
  ".turbo",
  "coverage",
  ".venv",
  "__pycache__",
]);

const MAX_FILES = 5000;

async function walk(root: string, dir: string, out: string[]): Promise<void> {
  if (out.length >= MAX_FILES) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (out.length >= MAX_FILES) return;
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      await walk(root, join(dir, entry.name), out);
    } else if (entry.isFile()) {
      out.push(relative(root, join(dir, entry.name)).split(sep).join("/"));
    }
  }
}

export function createLocalFileProvider(rootDir: string): FileProvider {
  return {
    async listFiles() {
      const out: string[] = [];
      await walk(rootDir, rootDir, out);
      return out;
    },
    async readFile(path: string) {
      try {
        const full = join(rootDir, ...path.split("/"));
        const s = await stat(full);
        if (!s.isFile()) return null;
        return await readFile(full, "utf8");
      } catch {
        return null;
      }
    },
  };
}
