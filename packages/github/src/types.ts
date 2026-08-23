export interface GitHubIdentity {
  login: string;
  avatarUrl: string;
  name: string | null;
}

export interface GitHubRepo {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  updatedAt: string;
}

export interface GitHubBranch {
  name: string;
  commitSha: string;
  protected: boolean;
}

export interface GitHubTreeEntry {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

export interface GitHubFileContent {
  path: string;
  sha: string;
  size: number;
  encoding: "base64" | "utf-8";
  content: string;
}

export interface GitHubCompareFile {
  filename: string;
  status:
    | "added"
    | "removed"
    | "modified"
    | "renamed"
    | "copied"
    | "changed"
    | "unchanged";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface GitHubCompareResult {
  status: "ahead" | "behind" | "identical" | "diverged";
  aheadBy: number;
  behindBy: number;
  totalCommits: number;
  files: GitHubCompareFile[];
}
