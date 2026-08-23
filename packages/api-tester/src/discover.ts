import type { OpenApiDiscoveryResult } from "./types.ts";

const COMMON_SPEC_PATHS = [
  "/openapi.json",
  "/swagger.json",
  "/api-docs",
  "/api/openapi.json",
  "/v1/openapi.json",
  "/.well-known/openapi.json",
];

/** Tries the well-known locations for an OpenAPI/Swagger spec. Returns null
 * (never a guess) when nothing that parses as a spec is found. */
export async function discoverOpenApiSpec(baseUrl: string): Promise<OpenApiDiscoveryResult | null> {
  const root = baseUrl.replace(/\/$/, "");
  for (const suffix of COMMON_SPEC_PATHS) {
    const specUrl = `${root}${suffix}`;
    try {
      const res = await fetch(specUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      if (data && typeof data === "object" && data.paths && typeof data.paths === "object") {
        return { specUrl, paths: Object.keys(data.paths) };
      }
    } catch {
      continue;
    }
  }
  return null;
}
