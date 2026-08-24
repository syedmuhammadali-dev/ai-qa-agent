import type { AIProvider, AIProviderId } from "./types";
import { openRouterProvider } from "./providers/openrouter";
import { geminiProvider } from "./providers/gemini";
import { openAICompatibleProvider } from "./providers/openai-compatible";

export * from "./types";
export * from "./fix-proposal";

const providers: Record<AIProviderId, AIProvider> = {
  openrouter: openRouterProvider,
  gemini: geminiProvider,
  "openai-compatible": openAICompatibleProvider,
};

export function getAIProvider(id: AIProviderId): AIProvider {
  const provider = providers[id];
  if (!provider) throw new Error(`Unknown AI provider: ${id}`);
  return provider;
}
