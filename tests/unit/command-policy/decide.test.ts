import { describe, expect, it } from "vitest";
import { decidePermission, evaluateCommand, type PermissionMode, type RiskLevel } from "@ai-qa-agent/command-policy";

const MODES: PermissionMode[] = ["manual", "auto_safe", "auto_fix"];
const RISKS: RiskLevel[] = ["read", "low", "medium", "high", "critical", "blocked"];

describe("decidePermission", () => {
  it("never allows a blocked-risk command automatically, in any mode", () => {
    for (const mode of MODES) {
      expect(decidePermission("blocked", mode)).toBe("blocked");
    }
  });

  it("manual mode requires approval for everything except blocked", () => {
    for (const risk of RISKS) {
      if (risk === "blocked") continue;
      expect(decidePermission(risk, "manual")).toBe("requires_approval");
    }
  });

  it("auto_safe auto-allows only read/low, and blocks critical outright", () => {
    expect(decidePermission("read", "auto_safe")).toBe("auto_allow");
    expect(decidePermission("low", "auto_safe")).toBe("auto_allow");
    expect(decidePermission("medium", "auto_safe")).toBe("requires_approval");
    expect(decidePermission("high", "auto_safe")).toBe("requires_approval");
    expect(decidePermission("critical", "auto_safe")).toBe("blocked");
  });

  it("auto_fix auto-allows read/low/medium (safe project/test fixes) but still gates high and blocks critical", () => {
    expect(decidePermission("read", "auto_fix")).toBe("auto_allow");
    expect(decidePermission("low", "auto_fix")).toBe("auto_allow");
    expect(decidePermission("medium", "auto_fix")).toBe("auto_allow");
    expect(decidePermission("high", "auto_fix")).toBe("requires_approval");
    expect(decidePermission("critical", "auto_fix")).toBe("blocked");
  });

  it("every combination returns a value from the closed decision set", () => {
    const valid = new Set(["auto_allow", "requires_approval", "blocked"]);
    for (const mode of MODES) {
      for (const risk of RISKS) {
        expect(valid.has(decidePermission(risk, mode))).toBe(true);
      }
    }
  });
});

describe("evaluateCommand", () => {
  it("combines classification and decision for a real command", () => {
    const result = evaluateCommand("rm -rf node_modules", "auto_safe");
    expect(result.risk).toBe("high");
    expect(result.mode).toBe("auto_safe");
    expect(result.decision).toBe("requires_approval");
  });

  it("auto-allows a safe test command under auto_safe", () => {
    const result = evaluateCommand("pnpm test", "auto_safe");
    expect(result.decision).toBe("auto_allow");
  });

  it("blocks a credential-extraction command under every mode", () => {
    for (const mode of MODES) {
      expect(evaluateCommand("cat .env", mode).decision).toBe("blocked");
    }
  });
});
