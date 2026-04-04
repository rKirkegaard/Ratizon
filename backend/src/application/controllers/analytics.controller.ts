import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { athletePmc } from "../../infrastructure/database/schema/analytics.schema.js";
import { sessions } from "../../infrastructure/database/schema/training.schema.js";
import { eq, and, gte, asc, sql } from "drizzle-orm";
import { PMCCalculator } from "../../domain/services/PMCCalculator.js";

/**
 * GET /api/analytics/:athleteId/pmc?days=90
 * Get PMC history from athlete_pmc table
 */
export async function getPmcHistory(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const days = parseInt(req.query.days as string) || 90;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const rows = await db
      .select()
      .from(athletePmc)
      .where(
        and(
          eq(athletePmc.athleteId, athleteId),
          gte(athletePmc.date, sinceDate)
        )
      )
      .orderBy(asc(athletePmc.date));

    const data = rows.map((r) => ({
      id: r.id.toString(),
      date: r.date.toISOString(),
      sport: r.sport,
      ctl: r.ctl,
      atl: r.atl,
      tsb: r.tsb,
      monotony: r.monotony,
      strain: r.strain,
      rampRate: r.rampRate,
    }));

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af PMC historik:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * POST /api/analytics/:athleteId/pmc/recalculate
 * Recalculate PMC from all session data using PMCCalculator
 */
export async function recalculatePmc(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const sport = (req.query.sport as string) || (req.body.sport as string) || "all";

    // Fetch all sessions for this athlete, ordered by date
    const sessionConditions = [eq(sessions.athleteId, athleteId)];
    if (sport !== "all") {
      sessionConditions.push(eq(sessions.sport, sport));
    }

    const sessionRows = await db
      .select({
        startedAt: sessions.startedAt,
        tss: sessions.tss,
        sessionAnalyticsTss: sql<number | null>`(SELECT sa.hrss FROM session_analytics sa WHERE sa.session_id = ${sessions.id} LIMIT 1)`,
      })
      .from(sessions)
      .where(and(...sessionConditions))
      .orderBy(asc(sessions.startedAt));

    if (sessionRows.length === 0) {
      res.json({
        data: [],
        message: "Ingen sessioner fundet for beregning",
      });
      return;
    }

    // Build daily TSS entries
    const dailyTssMap = new Map<string, number>();
    for (const s of sessionRows) {
      const dateKey = s.startedAt.toISOString().slice(0, 10);
      const tss = s.sessionAnalyticsTss ?? s.tss ?? 0;
      dailyTssMap.set(dateKey, (dailyTssMap.get(dateKey) || 0) + tss);
    }

    const dailyTssEntries = Array.from(dailyTssMap.entries()).map(
      ([date, tss]) => ({ date, tss })
    );

    // Calculate PMC
    const calculator = new PMCCalculator();
    const filledEntries = calculator.fillMissingDays(dailyTssEntries);
    const pmcResults = calculator.calculate(filledEntries);

    // Delete existing PMC entries for this athlete + sport
    if (sport === "all") {
      await db
        .delete(athletePmc)
        .where(eq(athletePmc.athleteId, athleteId));
    } else {
      await db
        .delete(athletePmc)
        .where(
          and(
            eq(athletePmc.athleteId, athleteId),
            eq(athletePmc.sport, sport)
          )
        );
    }

    // Insert new PMC data in batches
    const batchSize = 500;
    const sportLabel = sport === "all" ? "all" : sport;

    for (let i = 0; i < pmcResults.length; i += batchSize) {
      const batch = pmcResults.slice(i, i + batchSize).map((p) => ({
        athleteId,
        date: new Date(p.date),
        sport: sportLabel,
        ctl: p.ctl,
        atl: p.atl,
        tsb: p.tsb,
        monotony: p.monotony,
        strain: p.strain,
        rampRate: p.rampRate,
      }));

      await db.insert(athletePmc).values(batch);
    }

    res.json({
      data: {
        daysCalculated: pmcResults.length,
        latestCTL: pmcResults[pmcResults.length - 1]?.ctl ?? 0,
        latestATL: pmcResults[pmcResults.length - 1]?.atl ?? 0,
        latestTSB: pmcResults[pmcResults.length - 1]?.tsb ?? 0,
        sport: sportLabel,
      },
      message: `PMC genberegnet for ${pmcResults.length} dage`,
    });
  } catch (error: any) {
    console.error("Fejl ved genberegning af PMC:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}
