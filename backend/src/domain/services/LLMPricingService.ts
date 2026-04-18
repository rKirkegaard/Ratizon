/**
 * LLM Pricing Service — calculates cost in USD cents per request.
 *
 * Prices per 1K tokens (updated May 2025):
 */

interface ModelPricing {
  inputPer1k: number;  // USD
  outputPer1k: number; // USD
}

const PRICING: Record<string, ModelPricing> = {
  // OpenAI
  "gpt-4o":          { inputPer1k: 0.005,   outputPer1k: 0.015 },
  "gpt-4o-mini":     { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  "gpt-4.1":         { inputPer1k: 0.002,   outputPer1k: 0.008 },
  "gpt-4.1-mini":    { inputPer1k: 0.0004,  outputPer1k: 0.0016 },
  "o3-mini":         { inputPer1k: 0.0011,  outputPer1k: 0.0044 },

  // Anthropic
  "claude-sonnet-4-6":         { inputPer1k: 0.003,  outputPer1k: 0.015 },
  "claude-opus-4-6":           { inputPer1k: 0.015,  outputPer1k: 0.075 },
  "claude-haiku-4-5":          { inputPer1k: 0.0008, outputPer1k: 0.004 },
  "claude-3-5-sonnet-20241022": { inputPer1k: 0.003, outputPer1k: 0.015 },
  "claude-3-haiku-20240307":    { inputPer1k: 0.00025, outputPer1k: 0.00125 },

  // Google Gemini
  "gemini-2.5-pro":      { inputPer1k: 0.00125, outputPer1k: 0.01 },
  "gemini-2.5-flash":    { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  "gemini-2.0-flash":    { inputPer1k: 0.0001,  outputPer1k: 0.0004 },
  "gemini-2.0-flash-lite": { inputPer1k: 0.000075, outputPer1k: 0.0003 },

  // Mistral
  "mistral-large-latest": { inputPer1k: 0.002, outputPer1k: 0.006 },
  "mistral-small-latest": { inputPer1k: 0.0002, outputPer1k: 0.0006 },
};

// Fallback pricing for unknown models
const DEFAULT_PRICING: ModelPricing = { inputPer1k: 0.002, outputPer1k: 0.008 };

export function calculateCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model] ?? DEFAULT_PRICING;
  const costUsd =
    (inputTokens / 1000) * pricing.inputPer1k +
    (outputTokens / 1000) * pricing.outputPer1k;
  return Math.round(costUsd * 100 * 100) / 100; // cents with 2 decimal precision
}

export function getModelPricing(model: string): ModelPricing {
  return PRICING[model] ?? DEFAULT_PRICING;
}

export function getAvailableModels(): Record<string, string[]> {
  return {
    openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini"],
    anthropic: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5"],
    google: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"],
    mistral: ["mistral-large-latest", "mistral-small-latest"],
  };
}
