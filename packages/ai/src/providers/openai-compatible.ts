import type { AIChatRequest, AIChatResponse, AIProvider, AIProviderConfig } from "../types";

export const openAICompatibleProvider: AIProvider = {
  id: "openai-compatible",

  async chat(config: AIProviderConfig, request: AIChatRequest): Promise<AIChatResponse> {
    if (!config.baseUrl) {
      throw new Error("An OpenAI-compatible provider requires a base URL.");
    }
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
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
      throw new Error(`Request failed: ${res.status} ${await res.text()}`);
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
    if (!config.baseUrl) return { ok: false, error: "Base URL is required." };
    try {
      const res = await fetch(`${config.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  },
};
