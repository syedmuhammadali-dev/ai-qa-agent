export interface EndpointCheck {
  method: string;
  path: string;
  url: string;
  status: number | null;
  ok: boolean;
  durationMs: number;
  error: string | null;
  headers: Record<string, string>;
}

export interface SecurityHeaderCheck {
  header: string;
  present: boolean;
}

export interface OpenApiDiscoveryResult {
  specUrl: string;
  paths: string[];
}
