import type { AIChatRequest, AIChatResponse, AIProvider, AIProviderConfig } from "../types";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

export const openRouterProvider: AIProvider = {
  id: "openrouter",

  async chat(config: AIProviderConfig, request: AIChatRequest): Promise<AIChatResponse> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenRouter request failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? "",
      model: data.model ?? config.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      },
    };
  },

  async testConnection(config: AIProviderConfig) {
    try {
      const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
      const res = await fetch(`${baseUrl}/key`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  },
};
