import type {
  GitHubBranch,
  GitHubCompareFile,
  GitHubCompareResult,
  GitHubFileContent,
  GitHubIdentity,
  GitHubRepo,
  GitHubTreeEntry,
} from "./types";

const API_BASE = "https://api.github.com";

export class GitHubApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export interface GitHubClient {
  getIdentity(): Promise<GitHubIdentity>;
  listRepos(): Promise<GitHubRepo[]>;
  getRepo(owner: string, repo: string): Promise<GitHubRepo>;
  listBranches(owner: string, repo: string): Promise<GitHubBranch[]>;
  getTree(owner: string, repo: string, ref: string): Promise<GitHubTreeEntry[]>;
  getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string,
  ): Promise<GitHubFileContent>;
  compare(
    owner: string,
    repo: string,
    base: string,
    head: string,
  ): Promise<GitHubCompareResult>;
}

export function createGitHubClient(accessToken: string): GitHubClient {
  async function request<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!res.ok) {
      throw new GitHubApiError(
        res.status,
        `GitHub API ${path} failed: ${res.status} ${await res.text()}`,
      );
    }
    return res.json() as Promise<T>;
  }

  return {
    async getIdentity() {
      const data = await request<{
        login: string;
        avatar_url: string;
        name: string | null;
      }>("/user");
      return { login: data.login, avatarUrl: data.avatar_url, name: data.name };
    },

    async listRepos() {
      const data = await request<
        Array<{
          id: number;
          owner: { login: string };
          name: string;
          full_name: string;
          private: boolean;
          default_branch: string;
          html_url: string;
          updated_at: string;
        }>
      >(
        "/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member",
      );
      return data.map((r) => ({
        id: r.id,
        owner: r.owner.login,
        name: r.name,
        fullName: r.full_name,
        private: r.private,
        defaultBranch: r.default_branch,
        htmlUrl: r.html_url,
        updatedAt: r.updated_at,
      }));
    },

    async getRepo(owner, repo) {
      const r = await request<{
        id: number;
        owner: { login: string };
        name: string;
        full_name: string;
        private: boolean;
        default_branch: string;
        html_url: string;
        updated_at: string;
      }>(`/repos/${owner}/${repo}`);
      return {
        id: r.id,
        owner: r.owner.login,
        name: r.name,
        fullName: r.full_name,
        private: r.private,
        defaultBranch: r.default_branch,
        htmlUrl: r.html_url,
        updatedAt: r.updated_at,
      };
    },

    async listBranches(owner, repo) {
      const data = await request<
        Array<{ name: string; commit: { sha: string }; protected: boolean }>
      >(`/repos/${owner}/${repo}/branches?per_page=100`);
      return data.map((b) => ({
        name: b.name,
        commitSha: b.commit.sha,
        protected: b.protected,
      }));
    },

    async getTree(owner, repo, ref) {
      const data = await request<{
        tree: Array<{ path: string; type: string; sha: string; size?: number }>;
        truncated: boolean;
      }>(
        `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
      );
      return data.tree
        .filter(
          (entry): entry is typeof entry & { type: "blob" | "tree" } =>
            entry.type === "blob" || entry.type === "tree",
        )
        .map((entry) => ({
          path: entry.path,
          type: entry.type,
          sha: entry.sha,
          size: entry.size,
        }));
    },

    async getFileContent(owner, repo, path, ref) {
      const data = await request<{
        path: string;
        sha: string;
        size: number;
        encoding: string;
        content: string;
        type: string;
      }>(
        `/repos/${owner}/${repo}/contents/${path
          .split("/")
          .map(encodeURIComponent)
          .join("/")}?ref=${encodeURIComponent(ref)}`,
      );
      if (data.type !== "file") {
        throw new GitHubApiError(400, `${path} is not a file`);
      }
      return {
        path: data.path,
        sha: data.sha,
        size: data.size,
        encoding: data.encoding === "base64" ? "base64" : "utf-8",
        content: data.content,
      };
    },

    async compare(owner, repo, base, head) {
      const data = await request<{
        status: string;
        ahead_by: number;
        behind_by: number;
        total_commits: number;
        files?: Array<{
          filename: string;
          status: string;
          additions: number;
          deletions: number;
          changes: number;
          patch?: string;
        }>;
      }>(
        `/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
      );
      const files: GitHubCompareFile[] = (data.files ?? []).map((f) => ({
        filename: f.filename,
        status: f.status as GitHubCompareFile["status"],
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch,
      }));
      return {
        status: data.status as GitHubCompareResult["status"],
        aheadBy: data.ahead_by,
        behindBy: data.behind_by,
        totalCommits: data.total_commits,
        files,
      };
    },
  };
}
