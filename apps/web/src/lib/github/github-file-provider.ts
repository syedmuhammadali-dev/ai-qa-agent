import "server-only";
import type { FileProvider } from "@ai-qa-agent/project-analyzer";
import type { GitHubClient } from "@ai-qa-agent/github";

/** Adapts the GitHub API (tree + contents) to project-analyzer's FileProvider —
 * detection without ever cloning the repository. */
export function createGithubFileProvider(
  client: GitHubClient,
  owner: string,
  repo: string,
  ref: string
): FileProvider {
  let treeCache: string[] | null = null;

  return {
    async listFiles() {
      if (treeCache) return treeCache;
      const tree = await client.getTree(owner, repo, ref);
      treeCache = tree.filter((e) => e.type === "blob").map((e) => e.path);
      return treeCache;
    },
    async readFile(path: string) {
      try {
        const file = await client.getFileContent(owner, repo, path, ref);
        return file.encoding === "base64"
          ? Buffer.from(file.content, "base64").toString("utf8")
          : file.content;
      } catch {
        return null;
      }
    },
  };
}
