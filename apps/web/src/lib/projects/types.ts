export type ProjectStatus = "not_configured" | "ready" | "running" | "error";

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  githubRepoUrl?: string;
  frontendUrl?: string;
  backendUrl?: string;
  status: ProjectStatus;
  createdAt: number;
  updatedAt: number;
}

export interface NewProjectInput {
  name: string;
  githubRepoUrl?: string;
  frontendUrl?: string;
  backendUrl?: string;
}
