import { describe, expect, it } from "vitest";
import { buildAuthorizeUrl } from "@ai-qa-agent/github";

describe("buildAuthorizeUrl", () => {
  const config = {
    clientId: "client-123",
    clientSecret: "should-never-appear-in-the-url",
    redirectUri: "https://app.example.com/api/auth/github/callback",
  };

  it("includes client_id, redirect_uri, scope, and state as real query params", () => {
    const url = new URL(buildAuthorizeUrl(config, "signed-state-value"));
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("client-123");
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.get("state")).toBe("signed-state-value");
    expect(url.searchParams.get("scope")).toBe("repo read:user");
  });

  it("never leaks the client secret into the authorize URL", () => {
    const url = buildAuthorizeUrl(config, "state");
    expect(url).not.toContain("should-never-appear-in-the-url");
  });
});
