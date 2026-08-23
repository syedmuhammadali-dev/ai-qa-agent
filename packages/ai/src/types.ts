export type AIProviderId = "openrouter" | "gemini" | "openai-compatible";

export interface AIProviderConfig {
  provider: AIProviderId;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/** What's safe to persist/display — never the raw key. */
export interface RedactedAIProviderConfig {
  provider: AIProviderId;
  model: string;
  baseUrl?: string;
  keyLastFour: string;
  configuredAt: number;
}

export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIChatRequest {
  messages: AIChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface AIChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

export interface AIProvider {
  readonly id: AIProviderId;
  chat(config: AIProviderConfig, request: AIChatRequest): Promise<AIChatResponse>;
  /** Cheap call used to validate a key before saving it. */
  testConnection(config: AIProviderConfig): Promise<{ ok: boolean; error?: string }>;
}

export function redactApiKey(config: AIProviderConfig): RedactedAIProviderConfig {
  return {
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    keyLastFour: config.apiKey.slice(-4),
    configuredAt: Date.now(),
  };
}

export const PROVIDER_KEY_SIGNUP_URLS: Record<AIProviderId, string> = {
  openrouter: "https://openrouter.ai/keys",
  gemini: "https://aistudio.google.com/apikey",
  "openai-compatible": "https://platform.openai.com/api-keys",
};
