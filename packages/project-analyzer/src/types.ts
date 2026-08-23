/** Abstraction so detection works against a real local checkout or a remote
 * GitHub tree/contents API — never requires cloning inside a serverless runtime. */
export interface FileProvider {
  listFiles(): Promise<string[]>;
  readFile(path: string): Promise<string | null>;
}

export type SignalCategory =
  | "language"
  | "framework"
  | "packageManager"
  | "testFramework"
  | "database"
  | "orm"
  | "auth"
  | "linting"
  | "deployment"
  | "cicd"
  | "observability";

export interface DetectionSignal {
  category: SignalCategory;
  name: string;
  evidence: string;
}

export interface ProjectAnalysis {
  languages: string[];
  frameworks: string[];
  packageManager: string | null;
  testFrameworks: string[];
  databases: string[];
  orms: string[];
  authProviders: string[];
  linting: string[];
  deployment: string[];
  cicd: string[];
  observability: string[];
  signals: DetectionSignal[];
}
