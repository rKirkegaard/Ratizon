import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import {
  athletePmc,
  sessionAnalytics,
  sessionPowerCurve,
  athletePowerRecords,
} from "../../infrastructure/database/schema/analytics.schema.js";
import {
  sessions,
  plannedSessions,
  sessionTrackpoints,
  sessionLaps,
} from "../../infrastructure/database/schema/training.schema.js";
import { sportConfigs } from "../../infrastructure/database/schema/sport.schema.js";
import { eq, and, gte, lte, asc, desc, sql } from "drizzle-orm";
import { PMCCalculator } from "../../domain/services/PMCCalculator.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** ISO week-start (Monday) for a given date */
function getISOWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getUTCDay(); // 0=Sun ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  date.setUTCDate(date.getUTCDate() + diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/** ISO week-end (Sunday 23:59:59.999) for a given date */
function getISOWeekEnd(d: Date): Date {
  const start = getISOWeekStart(d);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

/** ISO week number */
function getISOWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Round to 2 decimals */
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Determine TSB status label */
function tsbStatus(tsb: number): string {
  if (tsb > 15) return "fresh";
  if (tsb >= -10) return "neutral";
  if (tsb >= -30) return "fatigued";
  return "overtrained";
}

// ---------------------------------------------------------------------------
// Existing endpoints
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fase 2 — Weekly Report
// ---------------------------------------------------------------------------

/**
 * GET /api/analytics/:athleteId/weekly?date=YYYY-MM-DD
 */
export async function getWeeklyReport(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const dateParam = req.query.date as string | undefined;
    const refDate = dateParam ? new Date(dateParam) : new Date();

    const weekStart = getISOWeekStart(refDate);
    const weekEnd = getISOWeekEnd(refDate);

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const isCurrentWeek =
      todayStart >= weekStart && todayStart <= weekEnd;

    // ---- Fetch sessions for the week with analytics ----
    const weekSessions = await db
      .select({
        id: sessions.id,
        sport: sessions.sport,
        title: sessions.title,
        startedAt: sessions.startedAt,
        durationSeconds: sessions.durationSeconds,
        distanceMeters: sessions.distanceMeters,
        avgHr: sessions.avgHr,
        tss: sql<number>`COALESCE(${sessionAnalytics.hrss}, ${sessions.tss}, 0)`,
        zone1Seconds: sessionAnalytics.zone1Seconds,
        zone2Seconds: sessionAnalytics.zone2Seconds,
        zone3Seconds: sessionAnalytics.zone3Seconds,
        zone4Seconds: sessionAnalytics.zone4Seconds,
        zone5Seconds: sessionAnalytics.zone5Seconds,
      })
      .from(sessions)
      .leftJoin(sessionAnalytics, eq(sessions.id, sessionAnalytics.sessionId))
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          gte(sessions.startedAt, weekStart),
          lte(sessions.startedAt, weekEnd)
        )
      )
      .orderBy(asc(sessions.startedAt));

    // ---- Planned TSS for the week ----
    const [plannedRow] = await db
      .select({
        totalPlannedTss: sql<number>`COALESCE(SUM(${plannedSessions.targetTss}), 0)`,
      })
      .from(plannedSessions)
      .where(
        and(
          eq(plannedSessions.athleteId, athleteId),
          gte(plannedSessions.scheduledDate, weekStart),
          lte(plannedSessions.scheduledDate, weekEnd)
        )
      );

    const plannedTss = Number(plannedRow?.totalPlannedTss ?? 0);

    // ---- Build summary ----
    let totalTss = 0;
    let totalDurationSec = 0;
    let totalDistanceM = 0;

    // discipline balance accumulators
    const disciplineMap = new Map<
      string,
      { tss: number; volumeM: number; sessions: number; durationSec: number }
    >();

    // zone totals
    let z1 = 0,
      z2 = 0,
      z3 = 0,
      z4 = 0,
      z5 = 0;

    const sessionsList: any[] = [];

    for (const s of weekSessions) {
      const sTss = Number(s.tss) || 0;
      totalTss += sTss;
      totalDurationSec += s.durationSeconds;
      totalDistanceM += s.distanceMeters ?? 0;

      // discipline
      const existing = disciplineMap.get(s.sport) ?? {
        tss: 0,
        volumeM: 0,
        sessions: 0,
        durationSec: 0,
      };
      existing.tss += sTss;
      existing.volumeM += s.distanceMeters ?? 0;
      existing.sessions += 1;
      existing.durationSec += s.durationSeconds;
      disciplineMap.set(s.sport, existing);

      // zones
      const sz1 = s.zone1Seconds ?? 0;
      const sz2 = s.zone2Seconds ?? 0;
      const sz3 = s.zone3Seconds ?? 0;
      const sz4 = s.zone4Seconds ?? 0;
      const sz5 = s.zone5Seconds ?? 0;
      z1 += sz1;
      z2 += sz2;
      z3 += sz3;
      z4 += sz4;
      z5 += sz5;

      const zoneTotalSec = sz1 + sz2 + sz3 + sz4 + sz5;

      sessionsList.push({
        id: s.id.toString(),
        sport: s.sport,
        date: s.startedAt.toISOString(),
        durationMin: r2(s.durationSeconds / 60),
        durationSec: s.durationSeconds,
        distanceM: s.distanceMeters ?? 0,
        avgHr: s.avgHr,
        title: s.title,
        tss: r2(sTss),
        zone1Pct: zoneTotalSec > 0 ? r2((sz1 / zoneTotalSec) * 100) : 0,
        zone2Pct: zoneTotalSec > 0 ? r2((sz2 / zoneTotalSec) * 100) : 0,
        zone3Pct: zoneTotalSec > 0 ? r2((sz3 / zoneTotalSec) * 100) : 0,
        zone4Pct: zoneTotalSec > 0 ? r2((sz4 / zoneTotalSec) * 100) : 0,
        zone5Pct: zoneTotalSec > 0 ? r2((sz5 / zoneTotalSec) * 100) : 0,
      });
    }

    const compliancePct =
      plannedTss > 0 ? r2((totalTss / plannedTss) * 100) : 0;

    const zoneTotalSec = z1 + z2 + z3 + z4 + z5;
    const zoneDistribution = {
      zone1Pct: zoneTotalSec > 0 ? r2((z1 / zoneTotalSec) * 100) : 0,
      zone2Pct: zoneTotalSec > 0 ? r2((z2 / zoneTotalSec) * 100) : 0,
      zone3Pct: zoneTotalSec > 0 ? r2((z3 / zoneTotalSec) * 100) : 0,
      zone4Pct: zoneTotalSec > 0 ? r2((z4 / zoneTotalSec) * 100) : 0,
      zone5Pct: zoneTotalSec > 0 ? r2((z5 / zoneTotalSec) * 100) : 0,
      totalDurationMin: r2(zoneTotalSec / 60),
    };

    const disciplineBalance = Array.from(disciplineMap.entries()).map(
      ([sport, v]) => ({
        sport,
        tss: r2(v.tss),
        volumeKm: r2(v.volumeM / 1000),
        sessions: v.sessions,
        duration: v.durationSec,
      })
    );

    // ---- PMC snapshot (latest row up to weekEnd) ----
    const [latestPmc] = await db
      .select()
      .from(athletePmc)
      .where(
        and(
          eq(athletePmc.athleteId, athleteId),
          lte(athletePmc.date, weekEnd)
        )
      )
      .orderBy(desc(athletePmc.date))
      .limit(1);

    // CTL 7 days ago
    const sevenDaysBeforeEnd = new Date(weekEnd);
    sevenDaysBeforeEnd.setUTCDate(sevenDaysBeforeEnd.getUTCDate() - 7);

    const [pmcPrev] = await db
      .select()
      .from(athletePmc)
      .where(
        and(
          eq(athletePmc.athleteId, athleteId),
          lte(athletePmc.date, sevenDaysBeforeEnd)
        )
      )
      .orderBy(desc(athletePmc.date))
      .limit(1);

    const currentCtl = latestPmc?.ctl ?? 0;
    const prevCtl = pmcPrev?.ctl ?? 0;

    const pmc = {
      ctl: r2(currentCtl),
      ctlChange7d: r2(currentCtl - prevCtl),
      atl: r2(latestPmc?.atl ?? 0),
      tsb: r2(latestPmc?.tsb ?? 0),
      tsbStatus: tsbStatus(latestPmc?.tsb ?? 0),
    };

    // ---- Load progression (last 8 weeks) ----
    const eightWeeksAgo = new Date(weekStart);
    eightWeeksAgo.setUTCDate(eightWeeksAgo.getUTCDate() - 7 * 7); // 7 more weeks before current

    const loadRows = await db
      .select({
        weekTrunc: sql<string>`DATE_TRUNC('week', ${sessions.startedAt})`,
        totalTss: sql<number>`COALESCE(SUM(COALESCE(${sessionAnalytics.hrss}, ${sessions.tss}, 0)), 0)`,
      })
      .from(sessions)
      .leftJoin(sessionAnalytics, eq(sessions.id, sessionAnalytics.sessionId))
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          gte(sessions.startedAt, eightWeeksAgo),
          lte(sessions.startedAt, weekEnd)
        )
      )
      .groupBy(sql`DATE_TRUNC('week', ${sessions.startedAt})`)
      .orderBy(sql`DATE_TRUNC('week', ${sessions.startedAt})`);

    const loadProgression = loadRows.map((row, idx) => {
      const wDate = new Date(row.weekTrunc);
      const weekNum = getISOWeekNumber(wDate);
      const total = Number(row.totalTss) || 0;
      const prev = idx > 0 ? Number(loadRows[idx - 1].totalTss) || 0 : 0;
      const changePct = idx > 0 && prev > 0 ? r2(((total - prev) / prev) * 100) : 0;
      return { weekNum, totalTss: r2(total), changePercent: changePct };
    });

    res.json({
      data: {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        isCurrentWeek,
        summary: {
          totalTss: r2(totalTss),
          plannedTss: r2(plannedTss),
          compliancePct,
          sessionCount: weekSessions.length,
          totalDurationSec,
          totalDistanceM,
        },
        disciplineBalance,
        zoneDistribution,
        sessions: sessionsList,
        pmc,
        loadProgression,
      },
    });
  } catch (error: any) {
    console.error("Fejl ved hentning af ugentlig rapport:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ---------------------------------------------------------------------------
// Fase 2 — Performance: EF Trend
// ---------------------------------------------------------------------------

/**
 * GET /api/analytics/:athleteId/ef-trend?days=90
 * EF = NP/avgHR (bike) or speed(m/s)/avgHR (run)
 */
export async function getEfTrend(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const days = parseInt(req.query.days as string) || 90;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const rows = await db
      .select({
        id: sessions.id,
        sport: sessions.sport,
        startedAt: sessions.startedAt,
        avgHr: sessions.avgHr,
        normalizedPower: sessions.normalizedPower,
        distanceMeters: sessions.distanceMeters,
        durationSeconds: sessions.durationSeconds,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          gte(sessions.startedAt, sinceDate),
          sql`${sessions.avgHr} > 0`
        )
      )
      .orderBy(asc(sessions.startedAt));

    const data: { date: string; sessionId: string; sport: string; ef: number }[] = [];

    for (const row of rows) {
      const hr = row.avgHr!;
      let ef: number | null = null;

      if (row.sport === "bike" && row.normalizedPower && row.normalizedPower > 0) {
        ef = row.normalizedPower / hr;
      } else if (row.sport === "run" && row.distanceMeters && row.durationSeconds > 0) {
        const speedMs = row.distanceMeters / row.durationSeconds;
        ef = speedMs / hr;
      }

      if (ef !== null && ef > 0) {
        data.push({
          date: row.startedAt.toISOString(),
          sessionId: row.id.toString(),
          sport: row.sport,
          ef: r2(ef),
        });
      }
    }

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af EF trend:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ---------------------------------------------------------------------------
// Fase 2 — Performance: Pace at HR
// ---------------------------------------------------------------------------

/**
 * GET /api/analytics/:athleteId/pace-at-hr?hrMin=140&hrMax=150
 * Filter: sport=run, avgHr in range, pace < 900 s/km (outlier filter)
 */
export async function getPaceAtHr(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const hrMin = parseInt(req.query.hrMin as string);
    const hrMax = parseInt(req.query.hrMax as string);

    if (isNaN(hrMin) || isNaN(hrMax)) {
      res.status(400).json({ error: "hrMin og hrMax er paakraevede" });
      return;
    }

    const rows = await db
      .select({
        id: sessions.id,
        startedAt: sessions.startedAt,
        avgPace: sessions.avgPace,
        avgHr: sessions.avgHr,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          eq(sessions.sport, "run"),
          gte(sessions.avgHr, hrMin),
          lte(sessions.avgHr, hrMax),
          sql`${sessions.avgPace} IS NOT NULL`,
          sql`${sessions.avgPace} < 900`
        )
      )
      .orderBy(asc(sessions.startedAt));

    const data = rows.map((row) => ({
      date: row.startedAt.toISOString(),
      sessionId: row.id.toString(),
      pace: r2(row.avgPace!),
      avgHr: row.avgHr,
    }));

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af pace-at-hr:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ---------------------------------------------------------------------------
// Fase 2 — Performance: Power at HR
// ---------------------------------------------------------------------------

/**
 * GET /api/analytics/:athleteId/power-at-hr?hrMin=140&hrMax=150
 * Filter: sport=bike, avgHr in range
 */
export async function getPowerAtHr(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const hrMin = parseInt(req.query.hrMin as string);
    const hrMax = parseInt(req.query.hrMax as string);

    if (isNaN(hrMin) || isNaN(hrMax)) {
      res.status(400).json({ error: "hrMin og hrMax er paakraevede" });
      return;
    }

    const rows = await db
      .select({
        id: sessions.id,
        startedAt: sessions.startedAt,
        avgPower: sessions.avgPower,
        avgHr: sessions.avgHr,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          eq(sessions.sport, "bike"),
          gte(sessions.avgHr, hrMin),
          lte(sessions.avgHr, hrMax),
          sql`${sessions.avgPower} IS NOT NULL`
        )
      )
      .orderBy(asc(sessions.startedAt));

    const data = rows.map((row) => ({
      date: row.startedAt.toISOString(),
      sessionId: row.id.toString(),
      power: row.avgPower,
      avgHr: row.avgHr,
    }));

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af power-at-hr:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ---------------------------------------------------------------------------
// Fase 2 — Load & Recovery: Ramp Rate
// ---------------------------------------------------------------------------

/**
 * GET /api/analytics/:athleteId/ramp-rate?weeks=12
 * TSS per ISO week with week-over-week ramp rate %
 */
export async function getRampRate(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const weeks = parseInt(req.query.weeks as string) || 12;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - weeks * 7);

    const rows = await db
      .select({
        weekTrunc: sql<string>`DATE_TRUNC('week', ${sessions.startedAt})`,
        totalTss: sql<number>`COALESCE(SUM(COALESCE(${sessionAnalytics.hrss}, ${sessions.tss}, 0)), 0)`,
      })
      .from(sessions)
      .leftJoin(sessionAnalytics, eq(sessions.id, sessionAnalytics.sessionId))
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          gte(sessions.startedAt, sinceDate)
        )
      )
      .groupBy(sql`DATE_TRUNC('week', ${sessions.startedAt})`)
      .orderBy(sql`DATE_TRUNC('week', ${sessions.startedAt})`);

    const data = rows.map((row, idx) => {
      const wDate = new Date(row.weekTrunc);
      const weekNum = getISOWeekNumber(wDate);
      const total = Number(row.totalTss) || 0;
      const prevTss = idx > 0 ? Number(rows[idx - 1].totalTss) || 0 : 0;
      const rampRatePct =
        idx > 0 && prevTss > 0 ? r2(((total - prevTss) / prevTss) * 100) : 0;
      return {
        weekNum,
        weekStart: wDate.toISOString(),
        totalTss: r2(total),
        prevTss: r2(prevTss),
        rampRatePct,
      };
    });

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af ramp rate:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ---------------------------------------------------------------------------
// Fase 2 — Load & Recovery: Monotony & Strain
// ---------------------------------------------------------------------------

/**
 * GET /api/analytics/:athleteId/monotony?weeks=8
 * Monotony = avg/sd of daily TSS within each week; Strain = monotony * totalTss
 */
export async function getMonotony(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const weeks = parseInt(req.query.weeks as string) || 8;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - weeks * 7);

    // Fetch daily TSS grouped by date
    const dailyRows = await db
      .select({
        day: sql<string>`DATE(${sessions.startedAt})`,
        totalTss: sql<number>`COALESCE(SUM(COALESCE(${sessionAnalytics.hrss}, ${sessions.tss}, 0)), 0)`,
      })
      .from(sessions)
      .leftJoin(sessionAnalytics, eq(sessions.id, sessionAnalytics.sessionId))
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          gte(sessions.startedAt, sinceDate)
        )
      )
      .groupBy(sql`DATE(${sessions.startedAt})`)
      .orderBy(sql`DATE(${sessions.startedAt})`);

    // Build a map of date -> tss
    const dailyTssMap = new Map<string, number>();
    for (const r of dailyRows) {
      dailyTssMap.set(String(r.day).slice(0, 10), Number(r.totalTss) || 0);
    }

    // Group by ISO week
    const weekMap = new Map<
      string,
      { weekNum: number; weekStart: Date; dailyValues: number[] }
    >();

    // Fill every day from sinceDate to today and bucket into weeks
    const cursor = new Date(sinceDate);
    cursor.setUTCHours(0, 0, 0, 0);
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);

    while (cursor <= today) {
      const dateKey = cursor.toISOString().slice(0, 10);
      const ws = getISOWeekStart(cursor);
      const wsKey = ws.toISOString().slice(0, 10);

      if (!weekMap.has(wsKey)) {
        weekMap.set(wsKey, {
          weekNum: getISOWeekNumber(cursor),
          weekStart: ws,
          dailyValues: [],
        });
      }
      weekMap.get(wsKey)!.dailyValues.push(dailyTssMap.get(dateKey) ?? 0);

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const data = Array.from(weekMap.values()).map((w) => {
      const vals = w.dailyValues;
      const totalTss = vals.reduce((a, b) => a + b, 0);
      const avg = vals.length > 0 ? totalTss / vals.length : 0;
      const variance =
        vals.length > 0
          ? vals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / vals.length
          : 0;
      const sd = Math.sqrt(variance);
      const monotony = sd > 0 ? r2(avg / sd) : 0;
      const strain = r2(monotony * totalTss);

      return {
        weekNum: w.weekNum,
        weekStart: w.weekStart.toISOString(),
        avgDailyTss: r2(avg),
        sdDailyTss: r2(sd),
        monotony,
        strain,
        totalTss: r2(totalTss),
      };
    });

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af monotony:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ---------------------------------------------------------------------------
// Fase 2 — Load & Recovery: Sport Balance
// ---------------------------------------------------------------------------

/**
 * GET /api/analytics/:athleteId/sport-balance?weeks=12
 * TSS per sport per week — uses sport_configs for dynamic sport keys
 */
export async function getSportBalance(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const weeks = parseInt(req.query.weeks as string) || 12;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - weeks * 7);

    // Fetch sport configs for this athlete (active ones)
    const configs = await db
      .select({ sportKey: sportConfigs.sportKey })
      .from(sportConfigs)
      .where(
        and(
          eq(sportConfigs.athleteId, athleteId),
          eq(sportConfigs.isActive, true)
        )
      )
      .orderBy(asc(sportConfigs.sortOrder));

    const sportKeys = configs.map((c) => c.sportKey);

    // Fetch weekly TSS per sport
    const rows = await db
      .select({
        weekTrunc: sql<string>`DATE_TRUNC('week', ${sessions.startedAt})`,
        sport: sessions.sport,
        totalTss: sql<number>`COALESCE(SUM(COALESCE(${sessionAnalytics.hrss}, ${sessions.tss}, 0)), 0)`,
      })
      .from(sessions)
      .leftJoin(sessionAnalytics, eq(sessions.id, sessionAnalytics.sessionId))
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          gte(sessions.startedAt, sinceDate)
        )
      )
      .groupBy(sql`DATE_TRUNC('week', ${sessions.startedAt})`, sessions.sport)
      .orderBy(sql`DATE_TRUNC('week', ${sessions.startedAt})`);

    // Build week -> { sport: tss } map
    const weekSportMap = new Map<string, Record<string, number>>();

    for (const row of rows) {
      const wKey = new Date(row.weekTrunc).toISOString().slice(0, 10);
      if (!weekSportMap.has(wKey)) {
        weekSportMap.set(wKey, {});
      }
      weekSportMap.get(wKey)![row.sport] = Number(row.totalTss) || 0;
    }

    // Collect all sport keys that appear in the data (union with configured ones)
    const allSports = new Set<string>(sportKeys);
    for (const sportMap of weekSportMap.values()) {
      for (const sport of Object.keys(sportMap)) {
        allSports.add(sport);
      }
    }

    const sortedSports = Array.from(allSports).sort();

    const data = Array.from(weekSportMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([wKey, sportMap]) => {
        const wDate = new Date(wKey);
        const weekNum = getISOWeekNumber(wDate);
        const entry: Record<string, any> = {
          weekNum,
          weekStart: wDate.toISOString(),
        };
        for (const sport of sortedSports) {
          entry[sport] = r2(sportMap[sport] ?? 0);
        }
        return entry;
      });

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af sport balance:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ===========================================================================
// Fase 3 — Running: Cadence Distribution
// ===========================================================================

/**
 * GET /api/analytics/:athleteId/running/cadence-distribution?days=90
 * Group trackpoint cadence by 5-spm buckets, return [{spm, pctTime}]
 */
export async function getRunningCadenceDistribution(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const days = parseInt(req.query.days as string) || 90;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const rows = await db
      .select({
        bucket: sql<number>`FLOOR(${sessionTrackpoints.cadence} / 5) * 5`,
        count: sql<number>`COUNT(*)`,
      })
      .from(sessionTrackpoints)
      .innerJoin(sessions, eq(sessionTrackpoints.sessionId, sessions.id))
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          eq(sessions.sport, "run"),
          gte(sessions.startedAt, sinceDate),
          sql`${sessionTrackpoints.cadence} IS NOT NULL`,
          sql`${sessionTrackpoints.cadence} > 0`
        )
      )
      .groupBy(sql`FLOOR(${sessionTrackpoints.cadence} / 5) * 5`)
      .orderBy(sql`FLOOR(${sessionTrackpoints.cadence} / 5) * 5`);

    const totalCount = rows.reduce((sum, r) => sum + Number(r.count), 0);

    const data = rows.map((r) => ({
      spm: Number(r.bucket),
      pctTime: totalCount > 0 ? r2((Number(r.count) / totalCount) * 100) : 0,
    }));

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af lobe-kadence-fordeling:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ===========================================================================
// Fase 3 — Running: GCT Balance
// ===========================================================================

/**
 * GET /api/analytics/:athleteId/running/gct-balance?days=90
 * From session_laps: avg GCT (avgCadence as proxy) per session over time
 */
export async function getRunningGCTBalance(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const days = parseInt(req.query.days as string) || 90;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    // Use avg cadence from laps as GCT proxy (GCT ~= 60000/cadence ms per step)
    const rows = await db
      .select({
        sessionId: sessions.id,
        startedAt: sessions.startedAt,
        avgCadence: sql<number>`AVG(${sessionLaps.avgCadence})`,
      })
      .from(sessions)
      .innerJoin(sessionLaps, eq(sessions.id, sessionLaps.sessionId))
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          eq(sessions.sport, "run"),
          gte(sessions.startedAt, sinceDate),
          sql`${sessionLaps.avgCadence} IS NOT NULL`,
          sql`${sessionLaps.avgCadence} > 0`
        )
      )
      .groupBy(sessions.id, sessions.startedAt)
      .orderBy(asc(sessions.startedAt));

    const data = rows.map((r) => {
      const cadence = Number(r.avgCadence);
      // GCT in ms = 60000 / (cadence * 2) — cadence is steps per minute for both feet
      const avgGct = cadence > 0 ? r2(60000 / cadence) : 0;
      return {
        date: r.startedAt.toISOString(),
        sessionId: r.sessionId.toString(),
        avgGct,
      };
    });

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af GCT balance:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ===========================================================================
// Fase 3 — Running: Vertical Ratio
// ===========================================================================

/**
 * GET /api/analytics/:athleteId/running/vertical-ratio?days=90
 * From session_laps: avg vertical oscillation proxy per session
 */
export async function getRunningVerticalRatio(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const days = parseInt(req.query.days as string) || 90;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    // Vertical oscillation: use pace and cadence as proxy
    // VO estimate = stride_length * vertical_ratio_constant
    // We use avg pace as indicator — lower pace means higher efficiency
    const rows = await db
      .select({
        sessionId: sessions.id,
        startedAt: sessions.startedAt,
        avgPace: sessions.avgPace,
        avgCadence: sql<number>`AVG(${sessionLaps.avgCadence})`,
      })
      .from(sessions)
      .innerJoin(sessionLaps, eq(sessions.id, sessionLaps.sessionId))
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          eq(sessions.sport, "run"),
          gte(sessions.startedAt, sinceDate),
          sql`${sessions.avgPace} IS NOT NULL`,
          sql`${sessionLaps.avgCadence} IS NOT NULL`
        )
      )
      .groupBy(sessions.id, sessions.startedAt, sessions.avgPace)
      .orderBy(asc(sessions.startedAt));

    const data = rows.map((r) => {
      const pace = Number(r.avgPace) || 0;
      const cadence = Number(r.avgCadence) || 0;
      // Estimate stride length (m) = 1000 / (pace * cadence / 60)
      // Estimate VO (cm) ~ stride_length * 6.5 (empirical ratio for recreational runners)
      let avgVo = 0;
      if (pace > 0 && cadence > 0) {
        const strideLengthM = 1000 / (pace * cadence / 60);
        avgVo = r2(strideLengthM * 6.5);
      }
      return {
        date: r.startedAt.toISOString(),
        sessionId: r.sessionId.toString(),
        avgVo,
      };
    });

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af vertical ratio:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ===========================================================================
// Fase 3 — Cycling: Power Curve
// ===========================================================================

/**
 * GET /api/analytics/:athleteId/cycling/power-curve
 * From session_power_curve + athlete_power_records
 * Returns [{durationSec, durationLabel, current90d, allTimeBest}]
 */
export async function getCyclingPowerCurve(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Recent 90-day best power per duration from session_power_curve
    const recentRows = await db
      .select({
        durationSeconds: sessionPowerCurve.durationSeconds,
        maxPower: sql<number>`MAX(${sessionPowerCurve.maxPower})`,
      })
      .from(sessionPowerCurve)
      .innerJoin(sessions, eq(sessionPowerCurve.sessionId, sessions.id))
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          eq(sessions.sport, "bike"),
          gte(sessions.startedAt, ninetyDaysAgo)
        )
      )
      .groupBy(sessionPowerCurve.durationSeconds)
      .orderBy(asc(sessionPowerCurve.durationSeconds));

    // All-time best from athlete_power_records
    const allTimeRows = await db
      .select({
        durationSeconds: athletePowerRecords.durationSeconds,
        maxPower: athletePowerRecords.maxPower,
      })
      .from(athletePowerRecords)
      .where(
        and(
          eq(athletePowerRecords.athleteId, athleteId),
          eq(athletePowerRecords.sport, "bike")
        )
      )
      .orderBy(asc(athletePowerRecords.durationSeconds));

    // Build duration label map
    function durationLabel(sec: number): string {
      if (sec < 60) return `${sec}s`;
      if (sec < 3600) return `${Math.floor(sec / 60)}m`;
      return `${Math.floor(sec / 3600)}t`;
    }

    // Merge recent and all-time into unified durations
    const allDurations = new Set<number>();
    for (const r of recentRows) allDurations.add(r.durationSeconds);
    for (const r of allTimeRows) allDurations.add(r.durationSeconds);

    const recentMap = new Map(recentRows.map((r) => [r.durationSeconds, Number(r.maxPower)]));
    const allTimeMap = new Map(allTimeRows.map((r) => [r.durationSeconds, r.maxPower]));

    const data = Array.from(allDurations)
      .sort((a, b) => a - b)
      .map((dur) => ({
        durationSec: dur,
        durationLabel: durationLabel(dur),
        current90d: recentMap.get(dur) ?? null,
        allTimeBest: allTimeMap.get(dur) ?? null,
      }));

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af power curve:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ===========================================================================
// Fase 3 — Cycling: Zone Distribution
// ===========================================================================

/**
 * GET /api/analytics/:athleteId/cycling/zone-distribution?days=90
 * Monthly zone distribution for bike sessions
 */
export async function getCyclingZoneDistribution(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const days = parseInt(req.query.days as string) || 90;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const MONTH_NAMES = [
      "Jan", "Feb", "Mar", "Apr", "Maj", "Jun",
      "Jul", "Aug", "Sep", "Okt", "Nov", "Dec",
    ];

    const rows = await db
      .select({
        month: sql<string>`TO_CHAR(${sessions.startedAt}, 'YYYY-MM')`,
        z1: sql<number>`SUM(${sessionAnalytics.zone1Seconds})`,
        z2: sql<number>`SUM(${sessionAnalytics.zone2Seconds})`,
        z3: sql<number>`SUM(${sessionAnalytics.zone3Seconds})`,
        z4: sql<number>`SUM(${sessionAnalytics.zone4Seconds})`,
        z5: sql<number>`SUM(${sessionAnalytics.zone5Seconds})`,
      })
      .from(sessions)
      .innerJoin(sessionAnalytics, eq(sessions.id, sessionAnalytics.sessionId))
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          eq(sessions.sport, "bike"),
          gte(sessions.startedAt, sinceDate)
        )
      )
      .groupBy(sql`TO_CHAR(${sessions.startedAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${sessions.startedAt}, 'YYYY-MM')`);

    const data = rows.map((r) => {
      const totalSec =
        Number(r.z1) + Number(r.z2) + Number(r.z3) + Number(r.z4) + Number(r.z5);
      const monthIdx = parseInt(r.month.split("-")[1]) - 1;
      return {
        month: r.month,
        monthName: MONTH_NAMES[monthIdx] ?? r.month,
        z1: totalSec > 0 ? r2((Number(r.z1) / totalSec) * 100) : 0,
        z2: totalSec > 0 ? r2((Number(r.z2) / totalSec) * 100) : 0,
        z3: totalSec > 0 ? r2((Number(r.z3) / totalSec) * 100) : 0,
        z4: totalSec > 0 ? r2((Number(r.z4) / totalSec) * 100) : 0,
        z5: totalSec > 0 ? r2((Number(r.z5) / totalSec) * 100) : 0,
      };
    });

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af cykel-zone-fordeling:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ===========================================================================
// Fase 3 — Cycling: Cadence vs Power
// ===========================================================================

/**
 * GET /api/analytics/:athleteId/cycling/cadence-power?days=90
 * Sample trackpoints: cadence vs power (max 2000 points, random sample)
 */
export async function getCyclingCadencePower(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const days = parseInt(req.query.days as string) || 90;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const rows = await db
      .select({
        cadence: sessionTrackpoints.cadence,
        power: sessionTrackpoints.power,
        sessionId: sessionTrackpoints.sessionId,
      })
      .from(sessionTrackpoints)
      .innerJoin(sessions, eq(sessionTrackpoints.sessionId, sessions.id))
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          eq(sessions.sport, "bike"),
          gte(sessions.startedAt, sinceDate),
          sql`${sessionTrackpoints.cadence} IS NOT NULL`,
          sql`${sessionTrackpoints.cadence} > 0`,
          sql`${sessionTrackpoints.power} IS NOT NULL`,
          sql`${sessionTrackpoints.power} > 0`
        )
      )
      .orderBy(sql`RANDOM()`)
      .limit(2000);

    const data = rows.map((r) => ({
      cadence: r.cadence!,
      power: r.power!,
      sessionId: r.sessionId.toString(),
    }));

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af kadence-power:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ===========================================================================
// Fase 3 — Swimming: Pace Progression
// ===========================================================================

/**
 * GET /api/analytics/:athleteId/swimming/pace-progression
 * Avg pace per swim session [{date, sessionId, avgPace}]
 */
export async function getSwimPaceProgression(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;

    const rows = await db
      .select({
        id: sessions.id,
        startedAt: sessions.startedAt,
        avgPace: sessions.avgPace,
        distanceMeters: sessions.distanceMeters,
        durationSeconds: sessions.durationSeconds,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          eq(sessions.sport, "swim"),
          sql`${sessions.avgPace} IS NOT NULL OR (${sessions.distanceMeters} IS NOT NULL AND ${sessions.distanceMeters} > 0)`
        )
      )
      .orderBy(asc(sessions.startedAt));

    const data = rows
      .map((r) => {
        // avgPace stored as seconds per km; convert to seconds per 100m
        let pacePerHundred: number | null = null;
        if (r.avgPace && r.avgPace > 0) {
          pacePerHundred = r2(r.avgPace / 10); // s/km -> s/100m
        } else if (r.distanceMeters && r.distanceMeters > 0) {
          pacePerHundred = r2((r.durationSeconds / r.distanceMeters) * 100);
        }
        if (pacePerHundred === null || pacePerHundred <= 0) return null;
        return {
          date: r.startedAt.toISOString(),
          sessionId: r.id.toString(),
          avgPace: pacePerHundred,
        };
      })
      .filter(Boolean);

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af svomme-pace-progression:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ===========================================================================
// Fase 3 — Swimming: SWOLF Trend
// ===========================================================================

/**
 * GET /api/analytics/:athleteId/swimming/swolf-trend
 * Avg SWOLF per swim session [{date, sessionId, avgSwolf}]
 * SWOLF = time per 25m length + strokes per length
 * Approximated from pace and cadence
 */
export async function getSwimSwolfTrend(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;

    const rows = await db
      .select({
        id: sessions.id,
        startedAt: sessions.startedAt,
        avgPace: sessions.avgPace,
        avgCadence: sessions.avgCadence,
        distanceMeters: sessions.distanceMeters,
        durationSeconds: sessions.durationSeconds,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          eq(sessions.sport, "swim"),
          sql`${sessions.avgCadence} IS NOT NULL`,
          sql`${sessions.avgCadence} > 0`
        )
      )
      .orderBy(asc(sessions.startedAt));

    const data = rows
      .map((r) => {
        // Time per 25m length in seconds
        let timePer25: number;
        if (r.avgPace && r.avgPace > 0) {
          timePer25 = (r.avgPace / 1000) * 25; // s/km * 25m / 1000
        } else if (r.distanceMeters && r.distanceMeters > 0) {
          timePer25 = (r.durationSeconds / r.distanceMeters) * 25;
        } else {
          return null;
        }

        // Strokes per 25m length: cadence is strokes/min
        const strokesPerMin = r.avgCadence!;
        const strokesPer25 = (strokesPerMin / 60) * timePer25;

        const swolf = r2(timePer25 + strokesPer25);
        if (swolf <= 0) return null;

        return {
          date: r.startedAt.toISOString(),
          sessionId: r.id.toString(),
          avgSwolf: swolf,
        };
      })
      .filter(Boolean);

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af SWOLF trend:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}
