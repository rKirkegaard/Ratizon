import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { goals } from "../../infrastructure/database/schema/planning.schema.js";
import { athletes } from "../../infrastructure/database/schema/athlete.schema.js";
import { athletePmc } from "../../infrastructure/database/schema/analytics.schema.js";
import { raceResults } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { eq, and, asc, desc } from "drizzle-orm";

// ── POST /api/ai-coaching/:athleteId/race-pacing/:goalId ─────────────

export async function generateRacePacing(req: Request, res: Response) {
  try {
    const { athleteId, goalId } = req.params;
    const { generateChatCompletionFull } = await import("../../infrastructure/llm/LLMClient.js");

    const [athlete] = await db.select({ ftp: athletes.ftp, weight: athletes.weight, runThresholdPace: athletes.runThresholdPace, swimCss: athletes.swimCss })
      .from(athletes).where(eq(athletes.id, athleteId)).limit(1);
    const [goal] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
    const [pmc] = await db.select({ ctl: athletePmc.ctl }).from(athletePmc)
      .where(and(eq(athletePmc.athleteId, athleteId), eq(athletePmc.sport, "all")))
      .orderBy(desc(athletePmc.date)).limit(1);

    if (!goal) { res.status(404).json({ error: "Maal ikke fundet" }); return; }

    const prompt = `Generer en race-day pacing strategi for:
Race: ${goal.title} (${goal.raceSubType ?? "full"} triathlon)
Maaltid: ${goal.raceTargetTime ? Math.floor(goal.raceTargetTime / 3600) + "t " + Math.floor((goal.raceTargetTime % 3600) / 60) + "m" : "ikke angivet"}
FTP: ${athlete?.ftp ?? "ukendt"}W, Vaegt: ${athlete?.weight ?? "ukendt"}kg
Loeb threshold: ${athlete?.runThresholdPace ?? "ukendt"} min/km
Svoem CSS: ${athlete?.swimCss ?? "ukendt"} sek/100m
Aktuel CTL: ${pmc?.ctl ?? "ukendt"}

Returner JSON:
{
  "swim": { "targetPace": "min:sek/100m", "strategy": "beskrivelse" },
  "bike": { "targetPower": watts, "targetSpeed": "km/t", "strategy": "beskrivelse", "segments": [{ "km": "0-30", "power": watts, "note": "" }] },
  "run": { "targetPace": "min:sek/km", "strategy": "beskrivelse", "segments": [{ "km": "0-5", "pace": "min:sek", "note": "" }] },
  "transitions": { "t1Target": sekunder, "t2Target": sekunder },
  "overallStrategy": "kort opsummering"
}`;

    const result = await generateChatCompletionFull(
      "Du er en erfaren triatlon-race strategist. Returner KUN gyldigt JSON.",
      [{ role: "user", content: prompt }],
      { athleteId, requestType: "race-pacing" }
    );

    let parsed: any;
    try {
      const match = result.content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, result.content];
      parsed = JSON.parse(match[1]!.trim());
    } catch { parsed = { raw: result.content }; }

    res.json({ data: { pacing: parsed, isMock: result.isMock ?? false } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── POST /api/ai-coaching/:athleteId/race-nutrition/:goalId ──────────

export async function generateRaceNutrition(req: Request, res: Response) {
  try {
    const { athleteId, goalId } = req.params;
    const { generateChatCompletionFull } = await import("../../infrastructure/llm/LLMClient.js");

    const [athlete] = await db.select({ weight: athletes.weight }).from(athletes).where(eq(athletes.id, athleteId)).limit(1);
    const [goal] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);

    const prompt = `Generer en race-day ernaeringsplan for:
Race: ${goal?.title ?? "Triathlon"} (${goal?.raceSubType ?? "full"})
Estimeret tid: ${goal?.raceTargetTime ? Math.floor(goal.raceTargetTime / 3600) + "t" : "ukendt"}
Vaegt: ${athlete?.weight ?? 75}kg

Returner JSON:
{
  "preRace": { "timing": "2t foer start", "calories": N, "carbs_g": N, "fluid_ml": N, "foods": ["..."] },
  "swim": { "notes": "ingen ernaering" },
  "bike": { "calories_per_hour": N, "carbs_per_hour": N, "fluid_per_hour_ml": N, "plan": [{ "time": "0-30min", "intake": "..." }] },
  "run": { "calories_per_hour": N, "carbs_per_hour": N, "fluid_per_hour_ml": N, "plan": [{ "time": "aid station 1", "intake": "..." }] },
  "postRace": { "timing": "0-30min efter", "protein_g": N, "carbs_g": N, "fluid_ml": N }
}`;

    const result = await generateChatCompletionFull(
      "Du er en sportsdiaetetiker specialiseret i triathlon. Returner KUN gyldigt JSON paa dansk.",
      [{ role: "user", content: prompt }],
      { athleteId, requestType: "race-nutrition" }
    );

    let parsed: any;
    try {
      const match = result.content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, result.content];
      parsed = JSON.parse(match[1]!.trim());
    } catch { parsed = { raw: result.content }; }

    res.json({ data: { nutrition: parsed, isMock: result.isMock ?? false } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── POST /api/ai-coaching/:athleteId/race-checklist/:goalId ──────────

export async function generateRaceChecklist(req: Request, res: Response) {
  try {
    const { athleteId, goalId } = req.params;
    const { generateChatCompletionFull } = await import("../../infrastructure/llm/LLMClient.js");

    const [goal] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);

    const result = await generateChatCompletionFull(
      "Du er en erfaren triathlon-coach. Generer en pre-race checklist paa dansk. Returner JSON array med kategorier.",
      [{ role: "user", content: `Generer checklist for ${goal?.title ?? "triathlon"} (${goal?.raceSubType ?? "full"}). JSON format: [{ "category": "Udstyr", "items": ["item1", "item2"] }]` }],
      { athleteId, requestType: "race-checklist" }
    );

    let parsed: any;
    try {
      const match = result.content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, result.content];
      parsed = JSON.parse(match[1]!.trim());
    } catch { parsed = [{ category: "Generelt", items: [result.content] }]; }

    res.json({ data: { checklist: parsed, isMock: result.isMock ?? false } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── POST /api/ai-coaching/:athleteId/race-debrief/:goalId ────────────

export async function generateRaceDebrief(req: Request, res: Response) {
  try {
    const { athleteId, goalId } = req.params;
    const { generateChatCompletionFull } = await import("../../infrastructure/llm/LLMClient.js");

    const [goal] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
    const [result_race] = await db.select().from(raceResults)
      .where(and(eq(raceResults.athleteId, athleteId), eq(raceResults.goalId, goalId)))
      .limit(1);

    const prompt = `Generer en post-race debrief analyse for:
Race: ${goal?.title ?? "Triathlon"}
Maal-tid: ${goal?.raceTargetTime ? Math.floor(goal.raceTargetTime / 3600) + "t " + Math.floor((goal.raceTargetTime % 3600) / 60) + "m" : "ukendt"}
${result_race ? `Aktuel tid: ${Math.floor((result_race.actualTotalTime ?? 0) / 3600)}t ${Math.floor(((result_race.actualTotalTime ?? 0) % 3600) / 60)}m
Svoem: ${result_race.actualSwimTime ? Math.floor(result_race.actualSwimTime / 60) + "m" : "N/A"}
Cykel: ${result_race.actualBikeTime ? Math.floor(result_race.actualBikeTime / 60) + "m" : "N/A"}
Loeb: ${result_race.actualRunTime ? Math.floor(result_race.actualRunTime / 60) + "m" : "N/A"}
Placering: ${result_race.overallPlacement ?? "N/A"}
Forhold: ${result_race.conditions ?? "N/A"}` : "Ingen raceresultat-data endnu."}

Returner JSON: { "wentWell": ["..."], "couldImprove": ["..."], "planVsActual": "...", "recommendations": ["..."], "overallAssessment": "..." }`;

    const llmResult = await generateChatCompletionFull(
      "Du er en erfaren triathlon-coach. Analyser race-performance. Svar paa dansk. Returner KUN JSON.",
      [{ role: "user", content: prompt }],
      { athleteId, requestType: "race-debrief" }
    );

    let parsed: any;
    try {
      const match = llmResult.content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, llmResult.content];
      parsed = JSON.parse(match[1]!.trim());
    } catch { parsed = { raw: llmResult.content }; }

    res.json({ data: { debrief: parsed, isMock: llmResult.isMock ?? false } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── Race Results CRUD ────────────────────────────────────────────────

export async function getRaceResults(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const rows = await db.select().from(raceResults)
      .where(eq(raceResults.athleteId, athleteId))
      .orderBy(desc(raceResults.raceDate));
    res.json({ data: rows });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

export async function createRaceResult(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const b = req.body;
    const [created] = await db.insert(raceResults).values({
      athleteId,
      goalId: b.goalId ?? null,
      raceName: b.raceName,
      raceDate: b.raceDate,
      raceType: b.raceType ?? null,
      actualSwimTime: b.actualSwimTime ?? null,
      actualBikeTime: b.actualBikeTime ?? null,
      actualRunTime: b.actualRunTime ?? null,
      actualTotalTime: b.actualTotalTime ?? null,
      conditions: b.conditions ?? null,
      notes: b.notes ?? null,
      overallPlacement: b.overallPlacement ?? null,
      ageGroupPlacement: b.ageGroupPlacement ?? null,
    }).returning();
    res.status(201).json({ data: created });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}
