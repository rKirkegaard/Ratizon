import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { llmSettings, athleteLlmPreferences, llmUsage } from "../../infrastructure/database/schema/llm.schema.js";
import { getUsageStats, checkMonthlyLimit } from "../../domain/services/LLMUsageService.js";
import { getAvailableModels } from "../../domain/services/LLMPricingService.js";
import { eq } from "drizzle-orm";

// ── GET /api/llm/settings ─────────────────────────────────────────────

export async function getSystemSettings(_req: Request, res: Response) {
  try {
    const [settings] = await db.select().from(llmSettings).limit(1);
    if (!settings) {
      res.json({ data: null });
      return;
    }
    // Don't expose encrypted keys
    res.json({
      data: {
        defaultProvider: settings.defaultProvider,
        defaultModel: settings.defaultModel,
        hasOpenaiKey: !!settings.openaiKeyEncrypted,
        hasAnthropicKey: !!settings.anthropicKeyEncrypted,
        globalMonthlyBudgetCents: settings.globalMonthlyBudgetCents,
        defaultSystemContext: settings.defaultSystemContext,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── PUT /api/llm/settings ─────────────────────────────────────────────

export async function updateSystemSettings(req: Request, res: Response) {
  try {
    const b = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (b.defaultProvider !== undefined) updates.defaultProvider = b.defaultProvider;
    if (b.defaultModel !== undefined) updates.defaultModel = b.defaultModel;
    if (b.globalMonthlyBudgetCents !== undefined) updates.globalMonthlyBudgetCents = b.globalMonthlyBudgetCents;
    if (b.defaultSystemContext !== undefined) updates.defaultSystemContext = b.defaultSystemContext;
    // Note: API keys should be stored encrypted; for now store plain (in production use AES-256-CBC)
    if (b.openaiKey !== undefined) updates.openaiKeyEncrypted = b.openaiKey;
    if (b.anthropicKey !== undefined) updates.anthropicKeyEncrypted = b.anthropicKey;

    const [existing] = await db.select().from(llmSettings).limit(1);
    if (existing) {
      await db.update(llmSettings).set(updates).where(eq(llmSettings.id, existing.id));
    } else {
      await db.insert(llmSettings).values(updates as any);
    }

    res.json({ data: { message: "Indstillinger opdateret" } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── GET /api/llm/preferences/:athleteId ───────────────────────────────

export async function getAthletePreferences(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const [prefs] = await db
      .select()
      .from(athleteLlmPreferences)
      .where(eq(athleteLlmPreferences.athleteId, athleteId))
      .limit(1);

    res.json({ data: prefs ?? { inheritFromSystem: true } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── PUT /api/llm/preferences/:athleteId ───────────────────────────────

export async function updateAthletePreferences(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const b = req.body;

    const [existing] = await db
      .select()
      .from(athleteLlmPreferences)
      .where(eq(athleteLlmPreferences.athleteId, athleteId))
      .limit(1);

    if (existing) {
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (b.inheritFromSystem !== undefined) updates.inheritFromSystem = b.inheritFromSystem;
      if (b.preferredProvider !== undefined) updates.preferredProvider = b.preferredProvider;
      if (b.preferredModel !== undefined) updates.preferredModel = b.preferredModel;
      if (b.monthlyBudgetCents !== undefined) updates.monthlyBudgetCents = b.monthlyBudgetCents;
      if (b.customSystemContext !== undefined) updates.customSystemContext = b.customSystemContext;

      await db.update(athleteLlmPreferences).set(updates).where(eq(athleteLlmPreferences.id, existing.id));
    } else {
      await db.insert(athleteLlmPreferences).values({
        athleteId,
        inheritFromSystem: b.inheritFromSystem ?? true,
        preferredProvider: b.preferredProvider ?? null,
        preferredModel: b.preferredModel ?? null,
        monthlyBudgetCents: b.monthlyBudgetCents ?? null,
        customSystemContext: b.customSystemContext ?? null,
      });
    }

    res.json({ data: { message: "Praeferencer opdateret" } });
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
