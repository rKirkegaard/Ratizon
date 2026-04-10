export interface LlmModel {
  id: string;
  name: string;
}

export interface LlmProvider {
  id: string;
  name: string;
  requiresApiKey: boolean;
  apiKeyPlaceholder?: string;
  models: LlmModel[];
}

export const LLM_PROVIDERS: LlmProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    requiresApiKey: true,
    apiKeyPlaceholder: "sk-...",
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
      { id: "gpt-4.1", name: "GPT-4.1" },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
      { id: "gpt-4.1-nano", name: "GPT-4.1 Nano" },
      { id: "o3-mini", name: "o3-mini" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    requiresApiKey: true,
    apiKeyPlaceholder: "sk-ant-...",
    models: [
      { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
    ],
  },
  {
    id: "google",
    name: "Google (Gemini)",
    requiresApiKey: true,
    apiKeyPlaceholder: "AIza...",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
      { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
    ],
  },
  {
    id: "mistral",
    name: "Mistral",
    requiresApiKey: true,
    apiKeyPlaceholder: "...",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large" },
      { id: "mistral-medium-latest", name: "Mistral Medium" },
      { id: "mistral-small-latest", name: "Mistral Small" },
      { id: "codestral-latest", name: "Codestral" },
      { id: "open-mistral-nemo", name: "Mistral Nemo" },
    ],
  },
  {
    id: "local",
    name: "Lokal (Ollama)",
    requiresApiKey: false,
    models: [
      { id: "llama3.3:latest", name: "Llama 3.3" },
      { id: "llama3.1:latest", name: "Llama 3.1" },
      { id: "mistral:latest", name: "Mistral (lokal)" },
      { id: "codellama:latest", name: "CodeLlama" },
      { id: "gemma2:latest", name: "Gemma 2" },
      { id: "phi3:latest", name: "Phi-3" },
      { id: "custom", name: "Brugerdefineret model" },
    ],
  },
];

export function getProvider(providerId: string): LlmProvider | undefined {
  return LLM_PROVIDERS.find((p) => p.id === providerId);
}

export function getModelsForProvider(providerId: string): LlmModel[] {
  return getProvider(providerId)?.models ?? [];
}

export function getAllModels(): { id: string; name: string; provider: string }[] {
  return LLM_PROVIDERS.flatMap((p) => p.models.map((m) => ({ ...m, provider: p.id })));
}
