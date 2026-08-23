import { describe, expect, it } from "vitest";
import { hashOutput, previewOutput, redactSecrets } from "@ai-qa-agent/agent-core";

describe("redactSecrets", () => {
  it("redacts an OpenAI-style key", () => {
    const out = redactSecrets("using key sk-abcdefghijklmnopqrstuvwx1234 for the call");
    expect(out).not.toContain("sk-abcdefghijklmnopqrstuvwx1234");
    expect(out).toContain("[REDACTED]");
  });

  it("redacts a GitHub personal access token", () => {
    const out = redactSecrets("token=ghp_1234567890abcdefghijklmnopqrstuvwxyz");
    expect(out).not.toContain("ghp_1234567890abcdefghijklmnopqrstuvwxyz");
  });

  it("redacts a KEY=value style env assignment", () => {
    const out = redactSecrets("OPENROUTER_API_KEY=super-secret-value-123");
    expect(out).not.toContain("super-secret-value-123");
    expect(out).toContain("OPENROUTER_API_KEY");
  });

  it("redacts a PEM private key block", () => {
    const pem = "-----BEGIN PRIVATE KEY-----\nMIIExampleNotARealKey==\n-----END PRIVATE KEY-----";
    const out = redactSecrets(`before\n${pem}\nafter`);
    expect(out).not.toContain("MIIExampleNotARealKey==");
    expect(out).toContain("before");
    expect(out).toContain("after");
  });

  it("leaves ordinary output untouched", () => {
    const text = "✓ auth.test.ts\n✓ users.test.ts\nAll tests passed";
    expect(redactSecrets(text)).toBe(text);
  });
});

describe("previewOutput", () => {
  it("truncates very long output", () => {
    const long = "x".repeat(5000);
    const preview = previewOutput(long);
    expect(preview.length).toBeLessThan(long.length);
    expect(preview).toContain("truncated");
  });

  it("redacts secrets before truncating", () => {
    const preview = previewOutput("sk-abcdefghijklmnopqrstuvwx1234");
    expect(preview).not.toContain("sk-abcdefghijklmnopqrstuvwx1234");
  });
});

describe("hashOutput", () => {
  it("is deterministic for the same input", () => {
    expect(hashOutput("out", "err")).toBe(hashOutput("out", "err"));
  });

  it("differs when stdout or stderr differ", () => {
    expect(hashOutput("out", "err")).not.toBe(hashOutput("out2", "err"));
    expect(hashOutput("out", "err")).not.toBe(hashOutput("out", "err2"));
  });

  it("does not collide across the stdout/stderr boundary", () => {
    expect(hashOutput("ab", "c")).not.toBe(hashOutput("a", "bc"));
  });
});
