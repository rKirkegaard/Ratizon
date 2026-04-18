import { Request, Response } from "express";
import * as PrefsService from "../../domain/services/LLMPreferencesService.js";
import { getEffectiveConfig } from "../../domain/services/EffectiveLLMService.js";
import { getUsageStats, checkMonthlyLimit } from "../../domain/services/LLMUsageService.js";
import { getAvailableModels } from "../../domain/services/LLMPricingService.js";

// ── GET /api/llm/settings ─────────────────────────────────────────────

export async function getSystemSettings(_req: Request, res: Response) {
  try {
    const settings = await PrefsService.getSystemSettings();
    res.json({ data: settings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── PUT /api/llm/settings ─────────────────────────────────────────────

export async function updateSystemSettings(req: Request, res: Response) {
  try {
    await PrefsService.updateSystemSettings(req.body);
    res.json({ data: { message: "Indstillinger opdateret" } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── GET /api/llm/preferences/:athleteId ───────────────────────────────

export async function getAthletePreferences(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const prefs = await PrefsService.getAthletePreferences(athleteId);
    res.json({ data: prefs ?? { inheritFromSystem: true } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── PUT /api/llm/preferences/:athleteId ───────────────────────────────

export async function updateAthletePreferences(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    await PrefsService.upsertAthletePreferences(athleteId, req.body);
    res.json({ data: { message: "Praeferencer opdateret" } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── DELETE /api/llm/preferences/:athleteId ─────────────────────────────

export async function deleteAthletePreferences(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    await PrefsService.deleteAthletePreferences(athleteId);
    res.json({ data: { message: "Praeferencer nulstillet til system-standard" } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── GET /api/llm/preferences/:athleteId/effective ─────────────────────

export async function getEffectivePreferences(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const config = await getEffectiveConfig(athleteId);
    // Never expose the API key to frontend
    res.json({
      data: {
        provider: config.provider,
        model: config.model,
        hasApiKey: !!config.apiKey,
        systemContext: config.systemContext,
        trainingDataRange: config.trainingDataRange,
        monthlyBudgetCents: config.monthlyBudgetCents,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── GET /api/llm/usage/:athleteId ─────────────────────────────────────

export async function getAthleteUsage(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const stats = await getUsageStats(athleteId);
    res.json({ data: stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── GET /api/llm/limit/:athleteId ─────────────────────────────────────

export async function checkAthleteLimit(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const limit = await checkMonthlyLimit(athleteId);
    res.json({ data: limit });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── GET /api/llm/models ───────────────────────────────────────────────

export async function getModels(_req: Request, res: Response) {
  res.json({ data: getAvailableModels() });
}
