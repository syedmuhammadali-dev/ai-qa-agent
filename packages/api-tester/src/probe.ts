import type { EndpointCheck, SecurityHeaderCheck } from "./types.ts";

const SECURITY_HEADERS = [
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "content-security-policy",
];

export async function probeEndpoint(method: string, url: string, timeoutMs = 10000): Promise<EndpointCheck> {
  const start = Date.now();
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    // leave path as the raw url if it isn't a valid absolute URL
  }

  try {
    const res = await fetch(url, { method, signal: AbortSignal.timeout(timeoutMs) });
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return {
      method,
      path,
      url,
      status: res.status,
      ok: res.ok,
      durationMs: Date.now() - start,
      error: null,
      headers,
    };
  } catch (err) {
    return {
      method,
      path,
      url,
      status: null,
      ok: false,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
      headers: {},
    };
  }
}

export function checkSecurityHeaders(headers: Record<string, string>): SecurityHeaderCheck[] {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return SECURITY_HEADERS.map((header) => ({ header, present: header in lower }));
}
