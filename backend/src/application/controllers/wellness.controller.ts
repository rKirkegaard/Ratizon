import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { wellnessDaily } from "../../infrastructure/database/schema/wellness.schema.js";
import { eq, and, gte, desc, sql } from "drizzle-orm";

/**
 * POST /api/wellness/:athleteId
 * Create or upsert a daily wellness entry by (athlete_id, date)
 */
export async function upsertWellness(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const {
      date,
      hrv_ms,
      resting_hr,
      sleep_hours,
      sleep_quality,
      stress_level,
      body_battery,
      fatigue,
      soreness,
      motivation,
      body_weight_kg,
      mood,
      notes,
    } = req.body;

    if (!date) {
      res.status(400).json({ error: "date er paakraevet" });
      return;
    }

    const entryDate = new Date(date);

    // Check if entry exists for this athlete + date
    const existing = await db
      .select()
      .from(wellnessDaily)
      .where(
        and(
          eq(wellnessDaily.athleteId, athleteId),
          eq(wellnessDaily.date, entryDate)
        )
      )
      .limit(1);

    const values = {
      hrvMssd: hrv_ms ?? null,
      restingHr: resting_hr ?? null,
      sleepHours: sleep_hours ?? null,
      sleepQuality: sleep_quality ?? null,
      stressLevel: stress_level ?? null,
      bodyBattery: body_battery ?? null,
      fatigue: fatigue ?? null,
      soreness: soreness ?? null,
      motivation: motivation ?? null,
      bodyWeight: body_weight_kg ?? null,
      mood: mood ?? null,
      notes: notes ?? null,
    };

    let result;
    if (existing.length > 0) {
      // Update
      const [updated] = await db
        .update(wellnessDaily)
        .set(values)
        .where(eq(wellnessDaily.id, existing[0].id))
        .returning();
      result = updated;
    } else {
      // Insert
      const [inserted] = await db
        .insert(wellnessDaily)
        .values({
          athleteId,
          date: entryDate,
          ...values,
        })
        .returning();
      result = inserted;
    }

    res.status(existing.length > 0 ? 200 : 201).json({ data: result });
  } catch (error: any) {
    console.error("Fejl ved upsert af wellness:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * GET /api/wellness/:athleteId/latest
 * Get the most recent wellness entry for an athlete
 */
export async function getLatestWellness(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;

    const [latest] = await db
      .select()
      .from(wellnessDaily)
      .where(eq(wellnessDaily.athleteId, athleteId))
      .orderBy(desc(wellnessDaily.date))
      .limit(1);

    if (!latest) {
      res.status(404).json({ error: "Ingen wellness data fundet" });
      return;
    }

    res.json({ data: latest });
  } catch (error: any) {
    console.error("Fejl ved hentning af seneste wellness:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * GET /api/wellness/:athleteId/history?days=30
 * Get wellness history for the past N days
 */
export async function getWellnessHistory(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const days = parseInt(req.query.days as string) || 30;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const entries = await db
      .select()
      .from(wellnessDaily)
      .where(
        and(
          eq(wellnessDaily.athleteId, athleteId),
          gte(wellnessDaily.date, sinceDate)
        )
      )
      .orderBy(desc(wellnessDaily.date));

    res.json({ data: entries });
  } catch (error: any) {
    console.error("Fejl ved hentning af wellness historik:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * GET /api/wellness/:athleteId/hrv-gate
 * Calculate HRV gate status based on 7-day rolling baseline
 */
export async function getHrvGate(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;

    // Get last 7 days of HRV data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const entries = await db
      .select({
        hrvMssd: wellnessDaily.hrvMssd,
        date: wellnessDaily.date,
      })
      .from(wellnessDaily)
      .where(
        and(
          eq(wellnessDaily.athleteId, athleteId),
          gte(wellnessDaily.date, sevenDaysAgo),
          sql`${wellnessDaily.hrvMssd} IS NOT NULL`
        )
      )
      .orderBy(desc(wellnessDaily.date));

    if (entries.length === 0) {
      res.json({
        data: {
          baseline: null,
          sd: null,
          latestHrv: null,
          gateStatus: "amber" as const,
          gateThresholds: null,
          message: "Ikke nok HRV data til beregning",
        },
      });
      return;
    }

    const hrvValues = entries.map((e) => e.hrvMssd!);
    const latestHrv = hrvValues[0];

    // Calculate baseline (mean)
    const baseline = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length;

    // Calculate standard deviation
    const variance =
      hrvValues.reduce((sum, val) => sum + Math.pow(val - baseline, 2), 0) /
      hrvValues.length;
    const sd = Math.sqrt(variance);

    // Determine gate status
    const lowerAmber = baseline - sd;
    const lowerRed = baseline - 2 * sd;

    let gateStatus: "green" | "amber" | "red";
    if (latestHrv >= lowerAmber) {
      gateStatus = "green";
    } else if (latestHrv >= lowerRed) {
      gateStatus = "amber";
    } else {
      gateStatus = "red";
    }

    res.json({
      data: {
        baseline: Math.round(baseline * 100) / 100,
        sd: Math.round(sd * 100) / 100,
        latestHrv: Math.round(latestHrv * 100) / 100,
        gateStatus,
        gateThresholds: {
          green: Math.round(lowerAmber * 100) / 100,
          amber: Math.round(lowerRed * 100) / 100,
        },
        dataPoints: hrvValues.length,
      },
    });
  } catch (error: any) {
    console.error("Fejl ved beregning af HRV gate:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}
