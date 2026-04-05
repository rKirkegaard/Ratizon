import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { racePlans, raceNutritionItems } from "../../infrastructure/database/schema/race-plan.schema.js";
import { eq, and, asc } from "drizzle-orm";

// Ironman distances in meters
const SWIM_DISTANCE = 3800;
const BIKE_DISTANCE = 180000;
const RUN_DISTANCE = 42195;

function computeSegmentTime(distance: number, pace: number | null, unit: "per100m" | "perKm"): number | null {
  if (!pace || pace <= 0) return null;
  if (unit === "per100m") return Math.round((distance / 100) * pace);
  return Math.round((distance / 1000) * pace);
}

// ── GET /api/planning/:athleteId/race-plans ────────────────────────────

export async function listRacePlans(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const rows = await db
      .select()
      .from(racePlans)
      .where(eq(racePlans.athleteId, athleteId))
      .orderBy(asc(racePlans.createdAt));
    res.json({ data: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── GET /api/planning/:athleteId/race-plans/:id ────────────────────────

export async function getRacePlan(req: Request, res: Response) {
  try {
    const { athleteId, id } = req.params;
    const [plan] = await db
      .select()
      .from(racePlans)
      .where(and(eq(racePlans.id, id), eq(racePlans.athleteId, athleteId)))
      .limit(1);

    if (!plan) {
      res.status(404).json({ error: "Raceplan ikke fundet" });
      return;
    }

    const nutrition = await db
      .select()
      .from(raceNutritionItems)
      .where(eq(raceNutritionItems.racePlanId, id))
      .orderBy(asc(raceNutritionItems.segmentType), asc(raceNutritionItems.timeOffsetMin));

    res.json({ data: { ...plan, nutritionItems: nutrition } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── POST /api/planning/:athleteId/race-plans ───────────────────────────

export async function createRacePlan(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const b = req.body;

    const swimTime = computeSegmentTime(SWIM_DISTANCE, b.swimPace, "per100m");
    const bikeTime = computeSegmentTime(BIKE_DISTANCE, b.bikePace, "perKm");
    const runTime = computeSegmentTime(RUN_DISTANCE, b.runPace, "perKm");
    const t1 = b.t1Target ?? 120;
    const t2 = b.t2Target ?? 90;
    const totalTime = (swimTime ?? 0) + t1 + (bikeTime ?? 0) + t2 + (runTime ?? 0);

    const [created] = await db
      .insert(racePlans)
      .values({
        athleteId,
        goalId: b.goalId ?? null,
        swimPace: b.swimPace ?? null,
        t1Target: t1,
        bikePower: b.bikePower ?? null,
        bikePace: b.bikePace ?? null,
        t2Target: t2,
        runPace: b.runPace ?? null,
        targetSwimTime: swimTime,
        targetBikeTime: bikeTime,
        targetRunTime: runTime,
        targetTotalTime: totalTime > 0 ? totalTime : null,
        nutritionStrategy: b.nutritionStrategy ?? null,
        hydrationStrategy: b.hydrationStrategy ?? null,
        notes: b.notes ?? null,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── PUT /api/planning/:athleteId/race-plans/:id ────────────────────────

export async function updateRacePlan(req: Request, res: Response) {
  try {
    const { athleteId, id } = req.params;
    const b = req.body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (b.swimPace !== undefined) updates.swimPace = b.swimPace;
    if (b.t1Target !== undefined) updates.t1Target = b.t1Target;
    if (b.bikePower !== undefined) updates.bikePower = b.bikePower;
    if (b.bikePace !== undefined) updates.bikePace = b.bikePace;
    if (b.t2Target !== undefined) updates.t2Target = b.t2Target;
    if (b.runPace !== undefined) updates.runPace = b.runPace;
    if (b.nutritionStrategy !== undefined) updates.nutritionStrategy = b.nutritionStrategy;
    if (b.hydrationStrategy !== undefined) updates.hydrationStrategy = b.hydrationStrategy;
    if (b.notes !== undefined) updates.notes = b.notes;

    // Recompute segment times if pace changed
    const swimPace = b.swimPace ?? (await db.select({ v: racePlans.swimPace }).from(racePlans).where(eq(racePlans.id, id)).limit(1))[0]?.v;
    const bikePace = b.bikePace ?? (await db.select({ v: racePlans.bikePace }).from(racePlans).where(eq(racePlans.id, id)).limit(1))[0]?.v;
    const runPace = b.runPace ?? (await db.select({ v: racePlans.runPace }).from(racePlans).where(eq(racePlans.id, id)).limit(1))[0]?.v;

    const swimTime = computeSegmentTime(SWIM_DISTANCE, swimPace, "per100m");
    const bikeTime = computeSegmentTime(BIKE_DISTANCE, bikePace, "perKm");
    const runTime = computeSegmentTime(RUN_DISTANCE, runPace, "perKm");
    const t1 = b.t1Target ?? 120;
    const t2 = b.t2Target ?? 90;

    updates.targetSwimTime = swimTime;
    updates.targetBikeTime = bikeTime;
    updates.targetRunTime = runTime;
    updates.targetTotalTime = (swimTime ?? 0) + t1 + (bikeTime ?? 0) + t2 + (runTime ?? 0) || null;

    const [updated] = await db
      .update(racePlans)
      .set(updates)
      .where(and(eq(racePlans.id, id), eq(racePlans.athleteId, athleteId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Raceplan ikke fundet" });
      return;
    }

    res.json({ data: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── DELETE /api/planning/:athleteId/race-plans/:id ─────────────────────

export async function deleteRacePlan(req: Request, res: Response) {
  try {
    const { athleteId, id } = req.params;
    const [deleted] = await db
      .delete(racePlans)
      .where(and(eq(racePlans.id, id), eq(racePlans.athleteId, athleteId)))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Raceplan ikke fundet" });
      return;
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── Nutrition CRUD ────────────────────────────────────────────────────

export async function createNutritionItem(req: Request, res: Response) {
  try {
    const { id: racePlanId } = req.params;
    const b = req.body;

    const [created] = await db
      .insert(raceNutritionItems)
      .values({
        racePlanId,
        segmentType: b.segmentType,
        timeOffsetMin: b.timeOffsetMin ?? 0,
        item: b.item,
        calories: b.calories ?? null,
        sodiumMg: b.sodiumMg ?? null,
        fluidMl: b.fluidMl ?? null,
        notes: b.notes ?? null,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteNutritionItem(req: Request, res: Response) {
  try {
    const { itemId } = req.params;
    await db.delete(raceNutritionItems).where(eq(raceNutritionItems.id, itemId));
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── GET /api/planning/:athleteId/race-plans/:id/timeline ──────────────

export async function getRaceTimeline(req: Request, res: Response) {
  try {
    const { athleteId, id } = req.params;

    const [plan] = await db
      .select()
      .from(racePlans)
      .where(and(eq(racePlans.id, id), eq(racePlans.athleteId, athleteId)))
      .limit(1);

    if (!plan) {
      res.status(404).json({ error: "Raceplan ikke fundet" });
      return;
    }

    const nutritionItems = await db
      .select()
      .from(raceNutritionItems)
      .where(eq(raceNutritionItems.racePlanId, id))
      .orderBy(asc(raceNutritionItems.segmentType), asc(raceNutritionItems.timeOffsetMin));

    // Build segments
    let clock = 0; // cumulative seconds

    const segments = [];

    // Swim
    const swimSec = plan.targetSwimTime ?? 0;
    segments.push({
      type: "swim",
      label: "Svoemning",
      distance: SWIM_DISTANCE,
      startSec: clock,
      durationSec: swimSec,
      pace: plan.swimPace ? `${Math.floor(plan.swimPace / 60)}:${String(Math.round(plan.swimPace % 60)).padStart(2, "0")}/100m` : null,
    });
    clock += swimSec;

    // T1
    const t1Sec = plan.t1Target ?? 120;
    segments.push({ type: "t1", label: "T1", distance: 0, startSec: clock, durationSec: t1Sec, pace: null });
    clock += t1Sec;

    // Bike
    const bikeSec = plan.targetBikeTime ?? 0;
    segments.push({
      type: "bike",
      label: "Cykling",
      distance: BIKE_DISTANCE,
      startSec: clock,
      durationSec: bikeSec,
      pace: plan.bikePower ? `${plan.bikePower}W` : plan.bikePace ? `${Math.round(BIKE_DISTANCE / 1000 / (bikeSec / 3600))} km/t` : null,
    });
    clock += bikeSec;

    // T2
    const t2Sec = plan.t2Target ?? 90;
    segments.push({ type: "t2", label: "T2", distance: 0, startSec: clock, durationSec: t2Sec, pace: null });
    clock += t2Sec;

    // Run
    const runSec = plan.targetRunTime ?? 0;
    segments.push({
      type: "run",
      label: "Loeb",
      distance: RUN_DISTANCE,
      startSec: clock,
      durationSec: runSec,
      pace: plan.runPace ? `${Math.floor(plan.runPace / 60)}:${String(Math.round(plan.runPace % 60)).padStart(2, "0")}/km` : null,
    });
    clock += runSec;

    // Map nutrition items to absolute race clock
    const segmentStartMap: Record<string, number> = {};
    for (const seg of segments) {
      segmentStartMap[seg.type] = seg.startSec;
    }

    const nutritionTimeline = nutritionItems.map((ni) => ({
      id: ni.id,
      raceClockMin: Math.round((segmentStartMap[ni.segmentType] ?? 0) / 60) + ni.timeOffsetMin,
      segmentType: ni.segmentType,
      item: ni.item,
      calories: ni.calories,
      sodiumMg: ni.sodiumMg,
      fluidMl: ni.fluidMl,
      notes: ni.notes,
    }));

    // Totals
    const totalCalories = nutritionItems.reduce((s, n) => s + (n.calories ?? 0), 0);
    const totalSodium = nutritionItems.reduce((s, n) => s + (n.sodiumMg ?? 0), 0);
    const totalFluid = nutritionItems.reduce((s, n) => s + (n.fluidMl ?? 0), 0);

    // Hourly rates for bike and run
    const bikeItems = nutritionItems.filter((n) => n.segmentType === "bike");
    const runItems = nutritionItems.filter((n) => n.segmentType === "run");
    const bikeHours = bikeSec / 3600;
    const runHours = runSec / 3600;

    res.json({
      data: {
        segments,
        totalTimeSec: clock,
        nutritionTimeline,
        totals: {
          calories: totalCalories,
          sodiumMg: totalSodium,
          fluidMl: totalFluid,
          caloriesPerHourBike: bikeHours > 0 ? Math.round(bikeItems.reduce((s, n) => s + (n.calories ?? 0), 0) / bikeHours) : 0,
          caloriesPerHourRun: runHours > 0 ? Math.round(runItems.reduce((s, n) => s + (n.calories ?? 0), 0) / runHours) : 0,
          fluidPerHourBike: bikeHours > 0 ? Math.round(bikeItems.reduce((s, n) => s + (n.fluidMl ?? 0), 0) / bikeHours) : 0,
          fluidPerHourRun: runHours > 0 ? Math.round(runItems.reduce((s, n) => s + (n.fluidMl ?? 0), 0) / runHours) : 0,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
