import type { AIChatRequest, AIChatResponse, AIProvider, AIProviderConfig } from "../types";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export const geminiProvider: AIProvider = {
  id: "gemini",

  async chat(config: AIProviderConfig, request: AIChatRequest): Promise<AIChatResponse> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const systemInstruction = request.messages.find((m) => m.role === "system")?.content;
    const contents = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const res = await fetch(
      `${baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          ...(systemInstruction
            ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
            : {}),
          generationConfig: {
            temperature: request.temperature,
            maxOutputTokens: request.maxTokens,
          },
        }),
      }
    );
    if (!res.ok) {
      throw new Error(`Gemini request failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
      model: config.model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount,
        completionTokens: data.usageMetadata?.candidatesTokenCount,
      },
    };
  },

  async testConnection(config: AIProviderConfig) {
    try {
      const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
      const res = await fetch(`${baseUrl}/models?key=${config.apiKey}`);
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  },
};
