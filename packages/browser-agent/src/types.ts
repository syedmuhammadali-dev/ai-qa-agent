export interface ConsoleIssue {
  type: string;
  text: string;
}

export interface NetworkIssue {
  url: string;
  status: number;
  method: string;
}

export interface SmokeCheckResult {
  url: string;
  finalUrl: string;
  title: string;
  httpStatus: number | null;
  loadTimeMs: number;
  consoleErrors: ConsoleIssue[];
  networkErrors: NetworkIssue[];
  screenshotPath: string | null;
  navigationError: string | null;
}

export interface AccessibilityViolation {
  id: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  nodeCount: number;
  targets: string[];
}

export interface AccessibilityCheckResult {
  url: string;
  navigationError: string | null;
  violations: AccessibilityViolation[];
  passes: number;
  incomplete: number;
}

export interface PerformanceCheckResult {
  url: string;
  navigationError: string | null;
  ttfbMs: number | null;
  domContentLoadedMs: number | null;
  loadMs: number | null;
  resourceCount: number;
  transferSizeBytes: number;
}
