import { describe, expect, it } from "vitest";
import { parseFileTargetResponse, parseFixPatchResponse } from "@ai-qa-agent/ai";

describe("parseFileTargetResponse", () => {
  it("parses a plain JSON response", () => {
    const result = parseFileTargetResponse('{"filePath": "src/auth.js", "reason": "stack trace points here"}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.filePath).toBe("src/auth.js");
      expect(result.value.reason).toBe("stack trace points here");
    }
  });

  it("strips a markdown code fence some models add despite instructions not to", () => {
    const result = parseFileTargetResponse('```json\n{"filePath": "src/db.js", "reason": "query error"}\n```');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.filePath).toBe("src/db.js");
  });

  it("fails cleanly on invalid JSON rather than throwing", () => {
    const result = parseFileTargetResponse("I think the problem is in src/auth.js");
    expect(result.ok).toBe(false);
  });

  it("fails cleanly when filePath is missing", () => {
    const result = parseFileTargetResponse('{"reason": "no idea"}');
    expect(result.ok).toBe(false);
  });

  it("fails cleanly when filePath is empty", () => {
    const result = parseFileTargetResponse('{"filePath": "", "reason": "no idea"}');
    expect(result.ok).toBe(false);
  });
});

describe("parseFixPatchResponse", () => {
  it("parses a valid SAFE fix", () => {
    const result = parseFixPatchResponse(
      JSON.stringify({ patchedContent: "export const x = 1;", explanation: "fixed the typo", safety: "SAFE" })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.safety).toBe("SAFE");
      expect(result.value.patchedContent).toBe("export const x = 1;");
    }
  });

  it.each(["SAFE", "REVIEW_REQUIRED", "DANGEROUS"])("accepts safety value %s", (safety) => {
    const result = parseFixPatchResponse(JSON.stringify({ patchedContent: "x", explanation: "", safety }));
    expect(result.ok).toBe(true);
  });

  it("rejects an invalid safety value rather than defaulting to something permissive", () => {
    const result = parseFixPatchResponse(JSON.stringify({ patchedContent: "x", explanation: "", safety: "PROBABLY_FINE" }));
    expect(result.ok).toBe(false);
  });

  it("rejects a response with no patchedContent", () => {
    const result = parseFixPatchResponse(JSON.stringify({ explanation: "", safety: "SAFE" }));
    expect(result.ok).toBe(false);
  });

  it("rejects empty patchedContent (would silently wipe the file)", () => {
    const result = parseFixPatchResponse(JSON.stringify({ patchedContent: "", explanation: "", safety: "SAFE" }));
    expect(result.ok).toBe(false);
  });

  it("fails cleanly on non-JSON output", () => {
    const result = parseFixPatchResponse("Sure, here's the fix: change line 12.");
    expect(result.ok).toBe(false);
  });
});
