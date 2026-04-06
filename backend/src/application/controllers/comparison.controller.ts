import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { sessions } from "../../infrastructure/database/schema/training.schema.js";
import { sessionAnalytics } from "../../infrastructure/database/schema/analytics.schema.js";
import { eq, and, gte, lte, sql, asc } from "drizzle-orm";

// ── GET /api/analytics/:athleteId/compare/sessions?a=ID&b=ID ─────────

export async function compareSessions(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const sessionAId = req.query.a as string;
    const sessionBId = req.query.b as string;

    if (!sessionAId || !sessionBId) {
      res.status(400).json({ error: "Begge session-ID'er (a og b) er paakraevede" });
      return;
    }

    async function getSessionWithAnalytics(sessionId: string) {
      const [session] = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.id, BigInt(sessionId)), eq(sessions.athleteId, athleteId)))
        .limit(1);

      if (!session) return null;

      const [analytics] = await db
        .select()
        .from(sessionAnalytics)
        .where(eq(sessionAnalytics.sessionId, BigInt(sessionId)))
        .limit(1);

      return {
        id: session.id.toString(),
        sport: session.sport,
        title: session.title,
        startedAt: session.startedAt.toISOString(),
        durationSeconds: session.durationSeconds,
        distanceMeters: session.distanceMeters,
        tss: session.tss,
        avgHr: session.avgHr,
        maxHr: session.maxHr,
        avgPower: session.avgPower,
        normalizedPower: session.normalizedPower,
        avgPace: session.avgPace,
        avgCadence: session.avgCadence,
        elevationGain: session.elevationGain,
        calories: session.calories,
        analytics: analytics
          ? {
              efficiencyFactor: analytics.efficiencyFactor,
              decoupling: analytics.decoupling,
              intensityFactor: analytics.intensityFactor,
              variabilityIndex: analytics.variabilityIndex,
              zones: [
                analytics.zone1Seconds,
                analytics.zone2Seconds,
                analytics.zone3Seconds,
                analytics.zone4Seconds,
                analytics.zone5Seconds,
              ],
              trimp: analytics.trimp,
              hrss: analytics.hrss,
            }
          : null,
      };
    }

    const [sessionA, sessionB] = await Promise.all([
      getSessionWithAnalytics(sessionAId),
      getSessionWithAnalytics(sessionBId),
    ]);

    if (!sessionA || !sessionB) {
      res.status(404).json({ error: "En eller begge sessioner blev ikke fundet" });
      return;
    }

    // Compute deltas
    const deltas: Record<string, number | null> = {};
    const numericFields = ["durationSeconds", "distanceMeters", "tss", "avgHr", "maxHr", "avgPower", "normalizedPower", "avgPace", "avgCadence", "elevationGain", "calories"] as const;

    for (const field of numericFields) {
      const a = sessionA[field];
      const b = sessionB[field];
      deltas[field] = a != null && b != null ? Math.round((b - a) * 100) / 100 : null;
    }

    res.json({
      data: {
        sessionA,
        sessionB,
        deltas,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── GET /api/analytics/:athleteId/compare/periods?startA=&endA=&startB=&endB= ──

export async function comparePeriods(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { startA, endA, startB, endB } = req.query;

    if (!startA || !endA || !startB || !endB) {
      res.status(400).json({ error: "startA, endA, startB, endB er paakraevede" });
      return;
    }

    async function getPeriodStats(start: string, end: string) {
      const rows = await db
        .select({
          count: sql<number>`COUNT(*)`,
          totalDuration: sql<number>`COALESCE(SUM(${sessions.durationSeconds}), 0)`,
          totalDistance: sql<number>`COALESCE(SUM(${sessions.distanceMeters}), 0)`,
          totalTss: sql<number>`COALESCE(SUM(${sessions.tss}), 0)`,
          avgHr: sql<number>`ROUND(AVG(${sessions.avgHr})::numeric, 0)`,
          avgPower: sql<number>`ROUND(AVG(${sessions.avgPower})::numeric, 0)`,
          avgPace: sql<number>`ROUND(AVG(${sessions.avgPace})::numeric, 1)`,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.athleteId, athleteId),
            gte(sessions.startedAt, new Date(start)),
            lte(sessions.startedAt, new Date(end))
          )
        );

      // Sport breakdown
      const sportBreakdown = await db
        .select({
          sport: sessions.sport,
          count: sql<number>`COUNT(*)`,
          duration: sql<number>`COALESCE(SUM(${sessions.durationSeconds}), 0)`,
          tss: sql<number>`COALESCE(SUM(${sessions.tss}), 0)`,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.athleteId, athleteId),
            gte(sessions.startedAt, new Date(start)),
            lte(sessions.startedAt, new Date(end))
          )
        )
        .groupBy(sessions.sport);

      return {
        startDate: start,
        endDate: end,
        sessionCount: Number(rows[0]?.count ?? 0),
        totalDurationSeconds: Number(rows[0]?.totalDuration ?? 0),
        totalDistanceMeters: Number(rows[0]?.totalDistance ?? 0),
        totalTss: Number(rows[0]?.totalTss ?? 0),
        avgHr: Number(rows[0]?.avgHr ?? 0),
        avgPower: Number(rows[0]?.avgPower ?? 0),
        avgPace: Number(rows[0]?.avgPace ?? 0),
        sportBreakdown: sportBreakdown.map((s) => ({
          sport: s.sport,
          sessionCount: Number(s.count),
          durationSeconds: Number(s.duration),
          tss: Number(s.tss),
        })),
      };
    }

    const [periodA, periodB] = await Promise.all([
      getPeriodStats(startA as string, endA as string),
      getPeriodStats(startB as string, endB as string),
    ]);

    res.json({
      data: {
        periodA,
        periodB,
        deltas: {
          sessionCount: periodB.sessionCount - periodA.sessionCount,
          totalDurationSeconds: periodB.totalDurationSeconds - periodA.totalDurationSeconds,
          totalTss: Math.round((periodB.totalTss - periodA.totalTss) * 10) / 10,
          avgHr: periodB.avgHr - periodA.avgHr,
          avgPower: periodB.avgPower - periodA.avgPower,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
