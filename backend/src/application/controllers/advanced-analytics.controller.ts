import { Request, Response } from "express";

// ── GET /api/ai-coaching/:athleteId/mental-readiness ─────────────────

export async function getMentalReadiness(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { assessMentalReadiness } = await import("../../domain/services/MentalReadinessService.js");
    const report = await assessMentalReadiness(athleteId as string);
    res.json({ data: report });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── GET /api/ai-coaching/:athleteId/decoupling-trend ─────────────────

export async function getDecouplingTrend(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const sport = (req.query.sport as string) ?? "all";
    const weeks = parseInt((req.query.weeks as string) ?? "12");
    const { getDecouplingTrend: getTrend } = await import("../../domain/services/AdvancedAnalyticsService.js");
    const trend = await getTrend(athleteId as string, sport, weeks);
    res.json({ data: trend });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── GET /api/ai-coaching/:athleteId/season-benchmark ─────────────────

export async function getSeasonBenchmark(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { getSeasonBenchmark: getBenchmark } = await import("../../domain/services/AdvancedAnalyticsService.js");
    const benchmark = await getBenchmark(athleteId as string);
    res.json({ data: benchmark });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── GET /api/ai-coaching/:athleteId/discipline-balance ───────────────

export async function getDisciplineBalance(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { getDisciplineBalance: getBalance } = await import("../../domain/services/AdvancedAnalyticsService.js");
    const balance = await getBalance(athleteId as string);
    res.json({ data: balance });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── POST /api/ai-coaching/:athleteId/nutrition-plan ──────────────────

export async function getNutritionPlan(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { generateChatCompletionFull } = await import("../../infrastructure/llm/LLMClient.js");
    const { calculateBMR, estimateSessionCalories } = await import("../../domain/services/NutritionService.js");

    // Import athlete data
    const { db } = await import("../../infrastructure/database/connection.js");
    const { athletes } = await import("../../infrastructure/database/schema/athlete.schema.js");
    const { eq } = await import("drizzle-orm");

    const [athlete] = await db.select({ weight: athletes.weight, height: athletes.height, dateOfBirth: athletes.dateOfBirth })
      .from(athletes).where(eq(athletes.id, athleteId as string)).limit(1);

    const weight = athlete?.weight ?? 75;
    const height = athlete?.height ?? 178;
    const age = athlete?.dateOfBirth ? Math.floor((Date.now() - new Date(athlete.dateOfBirth).getTime()) / (365.25 * 86400000)) : 35;
    const bmr = calculateBMR(weight, height, age);

    const result = await generateChatCompletionFull(
      "Du er en sportsdiaetetiker. Generer en daglig ernaeringsplan baseret paa traeningsdata. Svar paa dansk. Returner KUN JSON.",
      [{ role: "user", content: `BMR: ${bmr} kcal, Vaegt: ${weight}kg. Generer en ernaeringsplan. JSON: { "dailyCalories": N, "macros": { "carbsG": N, "proteinG": N, "fatG": N }, "mealPlan": [{ "meal": "...", "time": "...", "calories": N, "description": "..." }], "hydration": { "dailyMl": N, "note": "..." } }` }],
      { athleteId: athleteId as string, requestType: "nutrition-plan" }
    );

    let parsed: any;
    try {
      const match = result.content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, result.content];
      parsed = JSON.parse(match[1]!.trim());
    } catch { parsed = { raw: result.content }; }

    res.json({ data: { plan: parsed, bmr, isMock: result.isMock ?? false } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── GET /api/ai-coaching/:athleteId/taper-prediction ─────────────────

export async function getTaperPrediction(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const weeks = parseInt((req.query.weeks as string) ?? "3");
    const { predictTaperResponse } = await import("../../domain/services/AdvancedAnalyticsService.js");
    const prediction = await predictTaperResponse(athleteId as string, weeks);
    res.json({ data: prediction });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── GET /api/ai-coaching/:athleteId/training-age ─────────────────────

export async function getTrainingAge(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { estimateTrainingAge } = await import("../../domain/services/AdvancedAnalyticsService.js");
    const estimate = await estimateTrainingAge(athleteId as string);
    res.json({ data: estimate });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── POST /api/coach/equipment-check ──────────────────────────────────

export async function runEquipmentCheck(_req: Request, res: Response) {
  try {
    const { checkEquipmentLifespan } = await import("../../domain/services/EquipmentLifespanChecker.js");
    const result = await checkEquipmentLifespan();
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}
