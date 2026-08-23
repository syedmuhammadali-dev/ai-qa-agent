import type { FileProvider } from "@ai-qa-agent/project-analyzer";
import type { ImportGraph } from "./types.ts";

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const IMPORT_RE = /(?:import|export)\s+(?:[^'"]*?\sfrom\s+)?['"](\.[^'"]+)['"]|require\(\s*['"](\.[^'"]+)['"]\s*\)/g;

function isSourceFile(path: string): boolean {
  return SOURCE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

function resolveRelativeImport(fromFile: string, importPath: string, knownFiles: Set<string>): string | null {
  const fromDir = fromFile.split("/").slice(0, -1);
  const parts = [...fromDir, ...importPath.split("/")];
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  const base = stack.join("/");

  if (knownFiles.has(base)) return base;
  for (const ext of SOURCE_EXTENSIONS) {
    if (knownFiles.has(base + ext)) return base + ext;
  }
  for (const ext of SOURCE_EXTENSIONS) {
    if (knownFiles.has(`${base}/index${ext}`)) return `${base}/index${ext}`;
  }
  return null;
}

export async function buildImportGraph(provider: FileProvider, maxFiles = 1000): Promise<ImportGraph> {
  const allFiles = await provider.listFiles();
  const sourceFiles = allFiles.filter(isSourceFile).slice(0, maxFiles);
  const knownFiles = new Set(sourceFiles);

  const edges: ImportGraph["edges"] = [];

  for (const file of sourceFiles) {
    const content = await provider.readFile(file);
    if (!content) continue;
    for (const match of content.matchAll(IMPORT_RE)) {
      const importPath = match[1] ?? match[2];
      if (!importPath) continue;
      const resolved = resolveRelativeImport(file, importPath, knownFiles);
      if (resolved && resolved !== file) {
        edges.push({ from: file, to: resolved });
      }
    }
  }

  return { files: sourceFiles, edges };
}
