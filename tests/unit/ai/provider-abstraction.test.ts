import { afterEach, describe, expect, it, vi } from "vitest";
import { getAIProvider, redactApiKey } from "@ai-qa-agent/ai";
import type { AIProviderConfig } from "@ai-qa-agent/ai";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("redactApiKey", () => {
  it("never includes the raw API key, only the last 4 characters", () => {
    const config: AIProviderConfig = {
      provider: "openrouter",
      apiKey: "sk-or-v1-supersecretlongkeyvalue1234",
      model: "openai/gpt-4o-mini",
    };
    const redacted = redactApiKey(config);
    expect(redacted.keyLastFour).toBe("1234");
    expect(JSON.stringify(redacted)).not.toContain("supersecret");
    expect(JSON.stringify(redacted)).not.toContain(config.apiKey);
  });

  it("preserves provider/model/baseUrl for display", () => {
    const config: AIProviderConfig = {
      provider: "openai-compatible",
      apiKey: "abcd1234",
      model: "llama3",
      baseUrl: "http://localhost:11434/v1",
    };
    const redacted = redactApiKey(config);
    expect(redacted.provider).toBe("openai-compatible");
    expect(redacted.model).toBe("llama3");
    expect(redacted.baseUrl).toBe("http://localhost:11434/v1");
  });
});

describe("getAIProvider", () => {
  it("returns the matching provider for each known id", () => {
    expect(getAIProvider("openrouter").id).toBe("openrouter");
    expect(getAIProvider("gemini").id).toBe("gemini");
    expect(getAIProvider("openai-compatible").id).toBe("openai-compatible");
  });

  it("throws on an unknown provider id rather than silently falling back", () => {
    // @ts-expect-error deliberately invalid id
    expect(() => getAIProvider("not-a-real-provider")).toThrow(/Unknown AI provider/);
  });
});

function mockFetchOnce(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("openrouter provider", () => {
  it("chat() sends the correct request shape and parses a real-shaped response", async () => {
    const fetchMock = mockFetchOnce(200, {
      choices: [{ message: { content: "hello" } }],
      model: "openai/gpt-4o-mini",
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    });
    const provider = getAIProvider("openrouter");
    const result = await provider.chat(
      { provider: "openrouter", apiKey: "key", model: "openai/gpt-4o-mini" },
      { messages: [{ role: "user", content: "hi" }] },
    );
    expect(result.content).toBe("hello");
    expect(result.usage?.promptTokens).toBe(10);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer key");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("openai/gpt-4o-mini");
    expect(body.messages).toEqual([{ role: "user", content: "hi" }]);
  });

  it("chat() throws with the real status/body on a non-2xx response, never swallowing it", async () => {
    mockFetchOnce(401, { error: "invalid key" });
    const provider = getAIProvider("openrouter");
    await expect(
      provider.chat({ provider: "openrouter", apiKey: "bad", model: "x" }, { messages: [] }),
    ).rejects.toThrow(/401/);
  });

  it("testConnection() reports ok:false with the status on failure, never a false positive", async () => {
    mockFetchOnce(401, {});
    const provider = getAIProvider("openrouter");
    const result = await provider.testConnection({ provider: "openrouter", apiKey: "bad", model: "x" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("401");
  });

  it("testConnection() reports ok:true on a real 2xx", async () => {
    mockFetchOnce(200, {});
    const provider = getAIProvider("openrouter");
    const result = await provider.testConnection({ provider: "openrouter", apiKey: "good", model: "x" });
    expect(result.ok).toBe(true);
  });
});

describe("gemini provider", () => {
  it("chat() maps messages to Gemini's contents/systemInstruction shape correctly", async () => {
    const fetchMock = mockFetchOnce(200, {
      candidates: [{ content: { parts: [{ text: "hi there" }] } }],
      usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2 },
    });
    const provider = getAIProvider("gemini");
    const result = await provider.chat(
      { provider: "gemini", apiKey: "key", model: "gemini-2.0-flash" },
      { messages: [{ role: "system", content: "be terse" }, { role: "user", content: "hi" }] },
    );
    expect(result.content).toBe("hi there");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("gemini-2.0-flash:generateContent?key=key");
    const body = JSON.parse(init.body);
    expect(body.systemInstruction.parts[0].text).toBe("be terse");
    expect(body.contents).toEqual([{ role: "user", parts: [{ text: "hi" }] }]);
  });
});

describe("openai-compatible provider", () => {
  it("refuses to chat() without a base URL rather than silently guessing one", async () => {
    const provider = getAIProvider("openai-compatible");
    await expect(
      provider.chat({ provider: "openai-compatible", apiKey: "k", model: "m" }, { messages: [] }),
    ).rejects.toThrow(/base URL/i);
  });

  it("testConnection() requires a base URL too", async () => {
    const provider = getAIProvider("openai-compatible");
    const result = await provider.testConnection({ provider: "openai-compatible", apiKey: "k", model: "m" });
    expect(result.ok).toBe(false);
  });

  it("chat() hits the given base URL when one is provided", async () => {
    const fetchMock = mockFetchOnce(200, { choices: [{ message: { content: "ok" } }] });
    const provider = getAIProvider("openai-compatible");
    await provider.chat(
      { provider: "openai-compatible", apiKey: "k", model: "llama3", baseUrl: "http://localhost:11434/v1" },
      { messages: [{ role: "user", content: "hi" }] },
    );
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:11434/v1/chat/completions");
  });
});
