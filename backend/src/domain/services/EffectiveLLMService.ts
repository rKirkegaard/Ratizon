/**
 * Effective LLM Service — resolves the inheritance chain to determine
 * which provider, model, API key, system context, and training data range
 * to use for a given athlete.
 *
 * Resolution order:
 *   1. Load system settings (singleton)
 *   2. Load athlete preferences (if any)
 *   3. If no athlete prefs OR inheritFromSystem=true → all system values
 *   4. If inheritFromSystem=false → check each granular inherit flag
 *   5. Budget: athlete override > system global > null (unlimited)
 */

import {
  getSystemSettingsWithKeys,
  getAthletePreferences,
  type SystemSettingsRaw,
  type AthletePreferencesDTO,
} from "./LLMPreferencesService.js";
import { checkMonthlyLimit } from "./LLMUsageService.js";

// ── Types ──────────────────────────────────────────────────────────────

export interface EffectiveLLMConfig {
  provider: string;
  model: string;
  apiKey: string | null;
  systemContext: string | null;
  trainingDataRange: string;
  monthlyBudgetCents: number | null;
}

export interface EffectiveConfigWithBudget {
  config: EffectiveLLMConfig;
  budget: {
    allowed: boolean;
    currentCostCents: number;
    limitCents: number | null;
    usagePct: number;
  };
}

// ── Core resolution ────────────────────────────────────────────────────

export async function getEffectiveConfig(athleteId: string): Promise<EffectiveLLMConfig> {
  const system = await getSystemSettingsWithKeys();
  const athlete = await getAthletePreferences(athleteId);

  // No system settings at all → hard defaults
  if (!system) {
    return {
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY ?? null,
      systemContext: null,
      trainingDataRange: "2weeks",
      monthlyBudgetCents: null,
    };
  }

  // No athlete preferences OR master-switch on → all system values
  if (!athlete || athlete.inheritFromSystem) {
    return {
      provider: system.defaultProvider,
      model: system.defaultModel,
      apiKey: resolveApiKey(system, system.defaultProvider),
      systemContext: system.defaultSystemContext,
      trainingDataRange: system.defaultTrainingDataRange,
      monthlyBudgetCents: athlete?.monthlyBudgetCents ?? system.globalMonthlyBudgetCents,
    };
  }

  // Granular inheritance
  const provider = athlete.inheritProvider
    ? system.defaultProvider
    : (athlete.preferredProvider ?? system.defaultProvider);

  const model = athlete.inheritModel
    ? system.defaultModel
    : (athlete.preferredModel ?? system.defaultModel);

  const apiKey = athlete.inheritApiKey
    ? resolveApiKey(system, provider)
    : resolveApiKey(system, provider); // Future: athlete-level keys would go here

  const systemContext = athlete.inheritContext
    ? system.defaultSystemContext
    : (athlete.customSystemContext ?? system.defaultSystemContext);

  const trainingDataRange = athlete.trainingDataRange ?? system.defaultTrainingDataRange;

  const monthlyBudgetCents = athlete.monthlyBudgetCents ?? system.globalMonthlyBudgetCents;

  return {
    provider,
    model,
    apiKey,
    systemContext,
    trainingDataRange,
    monthlyBudgetCents,
  };
}

/**
 * Get effective config + budget check in one call.
 * Use this before every LLM request.
 */
export async function getEffectiveConfigWithBudget(athleteId: string): Promise<EffectiveConfigWithBudget> {
  const config = await getEffectiveConfig(athleteId);
  const budget = await checkMonthlyLimit(athleteId);

  return {
    config,
    budget: {
      allowed: budget.allowed,
      currentCostCents: budget.currentCostCents,
      limitCents: config.monthlyBudgetCents,
      usagePct: budget.usagePct,
    },
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────

function resolveApiKey(system: SystemSettingsRaw, provider: string): string | null {
  if (provider === "openai") {
    return system.openaiKey ?? process.env.OPENAI_API_KEY ?? null;
  }
  if (provider === "anthropic") {
    return system.anthropicKey ?? process.env.ANTHROPIC_API_KEY ?? null;
  }
  // Google, Mistral, local — env vars only for now
  if (provider === "google") return process.env.GOOGLE_API_KEY ?? null;
  if (provider === "mistral") return process.env.MISTRAL_API_KEY ?? null;
  return null; // local/ollama — no key needed
}
