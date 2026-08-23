import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkSecurityHeaders, discoverOpenApiSpec, probeEndpoint } from "@ai-qa-agent/api-tester";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === "/openapi.json") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ openapi: "3.0.0", paths: { "/users": {}, "/users/{id}": {} } }));
      return;
    }
    if (req.url === "/ok") {
      res.writeHead(200, { "content-type": "application/json", "x-content-type-options": "nosniff" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.url === "/missing") {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    if (req.url === "/broken") {
      res.writeHead(500);
      res.end("server error");
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (typeof address === "object" && address) {
    baseUrl = `http://127.0.0.1:${address.port}`;
  }
});

afterAll(() => {
  server.close();
});

describe("probeEndpoint against a real local server", () => {
  it("reports a real 200 with real headers", async () => {
    const result = await probeEndpoint("GET", `${baseUrl}/ok`);
    expect(result.status).toBe(200);
    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
    expect(result.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("reports a real 404, not a fabricated pass", async () => {
    const result = await probeEndpoint("GET", `${baseUrl}/missing`);
    expect(result.status).toBe(404);
    expect(result.ok).toBe(false);
  });

  it("reports a real 500", async () => {
    const result = await probeEndpoint("GET", `${baseUrl}/broken`);
    expect(result.status).toBe(500);
    expect(result.ok).toBe(false);
  });

  it("reports a real connection failure for an unreachable host, not a silent pass", async () => {
    const result = await probeEndpoint("GET", "http://127.0.0.1:1", 2000);
    expect(result.status).toBeNull();
    expect(result.ok).toBe(false);
    expect(result.error).not.toBeNull();
  });
});

describe("checkSecurityHeaders", () => {
  it("flags headers that are actually missing", () => {
    const checks = checkSecurityHeaders({ "x-content-type-options": "nosniff" });
    const byHeader = Object.fromEntries(checks.map((c) => [c.header, c.present]));
    expect(byHeader["x-content-type-options"]).toBe(true);
    expect(byHeader["strict-transport-security"]).toBe(false);
    expect(byHeader["content-security-policy"]).toBe(false);
  });
});

describe("discoverOpenApiSpec against a real local server", () => {
  it("finds and parses a real spec", async () => {
    const result = await discoverOpenApiSpec(baseUrl);
    expect(result?.paths).toEqual(["/users", "/users/{id}"]);
  });

  it("returns null when no spec exists at any known location", async () => {
    const emptyServer = createServer((_req, res) => {
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => emptyServer.listen(0, "127.0.0.1", resolve));
    const address = emptyServer.address();
    const emptyBaseUrl = typeof address === "object" && address ? `http://127.0.0.1:${address.port}` : "";

    const result = await discoverOpenApiSpec(emptyBaseUrl);
    expect(result).toBeNull();

    emptyServer.close();
  });
});
