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
