import type { PermissionMode } from "@ai-qa-agent/command-policy";

export type ProjectStatus = "not_configured" | "ready" | "running" | "error";

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  githubRepoUrl?: string;
  frontendUrl?: string;
  backendUrl?: string;
  status: ProjectStatus;
  permissionMode: PermissionMode;
  /** Opt-in only — evidence (screenshots) stays local by default. */
  evidenceUploadEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface NewProjectInput {
  name: string;
  githubRepoUrl?: string;
  frontendUrl?: string;
  backendUrl?: string;
}
