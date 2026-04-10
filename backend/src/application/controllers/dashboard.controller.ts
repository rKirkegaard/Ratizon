import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { wellnessDaily, athleteStreaks } from "../../infrastructure/database/schema/wellness.schema.js";
import { sessions, plannedSessions } from "../../infrastructure/database/schema/training.schema.js";
import { athletePmc, sessionQualityAssessments } from "../../infrastructure/database/schema/analytics.schema.js";
import { aiAlerts } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { goals } from "../../infrastructure/database/schema/planning.schema.js";
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";

/**
 * GET /api/dashboard/:athleteId
 * Get full dashboard data in a single call
 */
export async function getDashboard(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Week boundaries (Monday-based)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() + mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Run all queries in parallel
    const [
      wellnessResult,
      hrvGateResult,
      pmcResult,
      pmc7dAgoResult,
      todaysPlannedResult,
      yesterdaySessionsResult,
      weekSessionsResult,
      weekPlannedResult,
      upcomingResult,
      alertsResult,
      streakResult,
      mainGoalResult,
      nextGoalResult,
    ] = await Promise.all([
      // Latest wellness
      db
        .select()
        .from(wellnessDaily)
        .where(eq(wellnessDaily.athleteId, athleteId))
        .orderBy(desc(wellnessDaily.date))
        .limit(1),

      // HRV gate: last 7 days with HRV
      db
        .select({ hrvMssd: wellnessDaily.hrvMssd })
        .from(wellnessDaily)
        .where(
          and(
            eq(wellnessDaily.athleteId, athleteId),
            gte(wellnessDaily.date, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
            sql`${wellnessDaily.hrvMssd} IS NOT NULL`
          )
        )
        .orderBy(desc(wellnessDaily.date)),

      // Latest PMC entry
      db
        .select()
        .from(athletePmc)
        .where(eq(athletePmc.athleteId, athleteId))
        .orderBy(desc(athletePmc.date))
        .limit(1),

      // PMC from 7 days ago (for CTL trend)
      db
        .select()
        .from(athletePmc)
        .where(
          and(
            eq(athletePmc.athleteId, athleteId),
            lte(athletePmc.date, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
          )
        )
        .orderBy(desc(athletePmc.date))
        .limit(1),

      // Today's planned sessions
      db
        .select()
        .from(plannedSessions)
        .where(
          and(
            eq(plannedSessions.athleteId, athleteId),
            gte(plannedSessions.scheduledDate, todayStart),
            lte(plannedSessions.scheduledDate, todayEnd)
          )
        )
        .orderBy(asc(plannedSessions.scheduledDate)),

      // Yesterday's completed sessions with quality
      db
        .select({
          session: sessions,
          quality: sessionQualityAssessments,
        })
        .from(sessions)
        .leftJoin(
          sessionQualityAssessments,
          eq(sessions.id, sessionQualityAssessments.sessionId)
        )
        .where(
          and(
            eq(sessions.athleteId, athleteId),
            gte(sessions.startedAt, yesterdayStart),
            lte(sessions.startedAt, todayStart)
          )
        )
        .orderBy(asc(sessions.startedAt)),

      // This week's completed sessions (for week status)
      db
        .select({
          tss: sessions.tss,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.athleteId, athleteId),
            gte(sessions.startedAt, weekStart),
            lte(sessions.startedAt, weekEnd)
          )
        ),

      // This week's planned sessions (for compliance)
      db
        .select({
          targetTss: plannedSessions.targetTss,
          completedSessionId: plannedSessions.completedSessionId,
        })
        .from(plannedSessions)
        .where(
          and(
            eq(plannedSessions.athleteId, athleteId),
            gte(plannedSessions.scheduledDate, weekStart),
            lte(plannedSessions.scheduledDate, weekEnd)
          )
        ),

      // Upcoming planned sessions (next 3 from today)
      db
        .select()
        .from(plannedSessions)
        .where(
          and(
            eq(plannedSessions.athleteId, athleteId),
            gte(plannedSessions.scheduledDate, todayEnd)
          )
        )
        .orderBy(asc(plannedSessions.scheduledDate))
        .limit(3),

      // Active unacknowledged alerts (max 5)
      db
        .select()
        .from(aiAlerts)
        .where(
          and(
            eq(aiAlerts.athleteId, athleteId),
            eq(aiAlerts.acknowledged, false)
          )
        )
        .orderBy(desc(aiAlerts.createdAt))
        .limit(5),

      // Streaks
      db
        .select()
        .from(athleteStreaks)
        .where(eq(athleteStreaks.athleteId, athleteId)),

      // Main race goal (A-priority, active, future)
      db
        .select()
        .from(goals)
        .where(
          and(
            eq(goals.athleteId, athleteId),
            eq(goals.status, "active"),
            eq(goals.racePriority, "A"),
            gte(goals.targetDate, now)
          )
        )
        .orderBy(asc(goals.targetDate))
        .limit(1),

      // Next sub-goal (B or C priority, active, future)
      db
        .select()
        .from(goals)
        .where(
          and(
            eq(goals.athleteId, athleteId),
            eq(goals.status, "active"),
            gte(goals.targetDate, now)
          )
        )
        .orderBy(asc(goals.targetDate))
        .limit(5),
    ]);

    // --- Build wellness section ---
    const latestWellness = wellnessResult[0] || null;

    let gateStatus: "green" | "amber" | "red" = "amber";
    let hrvBaseline: number | null = null;
    let hrvSd: number | null = null;
    if (hrvGateResult.length > 0) {
      const hrvValues = hrvGateResult.map((e) => e.hrvMssd!);
      hrvBaseline = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length;
      const variance =
        hrvValues.reduce((sum, val) => sum + Math.pow(val - hrvBaseline!, 2), 0) /
        hrvValues.length;
      hrvSd = Math.sqrt(variance);

      if (hrvValues.length > 0) {
        const latest = hrvValues[0];
        const lowerAmber = hrvBaseline - hrvSd;
        const lowerRed = hrvBaseline - 2 * hrvSd;
        if (latest >= lowerAmber) gateStatus = "green";
        else if (latest >= lowerRed) gateStatus = "amber";
        else gateStatus = "red";
      }
    }

    // --- Build fitness section ---
    const latestPmc = pmcResult[0] || null;
    const pmc7dAgo = pmc7dAgoResult[0] || null;

    let tsbStatus: string = "unknown";
    if (latestPmc) {
      if (latestPmc.tsb > 15) tsbStatus = "fresh";
      else if (latestPmc.tsb >= -10) tsbStatus = "neutral";
      else if (latestPmc.tsb >= -30) tsbStatus = "fatigued";
      else tsbStatus = "overtrained";
    }

    const ctlTrend = latestPmc && pmc7dAgo
      ? Math.round((latestPmc.ctl - pmc7dAgo.ctl) * 100) / 100
      : 0;

    // --- Build week status ---
    const weekTssValues = weekSessionsResult.map(
      (s) => s.tss || 0
    );
    const totalTss = Math.round(
      weekTssValues.reduce((a, b) => a + b, 0) * 100
    ) / 100;

    const plannedTssValues = weekPlannedResult.map((p) => p.targetTss || 0);
    const plannedTss = Math.round(
      plannedTssValues.reduce((a, b) => a + b, 0) * 100
    ) / 100;

    const completedPlanned = weekPlannedResult.filter(
      (p) => p.completedSessionId !== null
    ).length;
    const totalPlanned = weekPlannedResult.length;
    const compliancePct =
      totalPlanned > 0
        ? Math.round((completedPlanned / totalPlanned) * 100)
        : 0;

    const remainingPlanned = weekPlannedResult.filter(
      (p) => p.completedSessionId === null
    ).length;

    // --- Build motivation section ---
    const trainingStreak = streakResult.find(
      (s) => s.streakType === "training"
    );

    const response = {
      wellness: {
        latest: latestWellness,
        gate: {
          baseline: hrvBaseline ? Math.round(hrvBaseline * 100) / 100 : null,
          sd: hrvSd ? Math.round(hrvSd * 100) / 100 : null,
          latestHrv: latestWellness?.hrvMssd ?? null,
          gateStatus,
        },
      },
      fitness: {
        ctl: latestPmc?.ctl ?? 0,
        atl: latestPmc?.atl ?? 0,
        tsb: latestPmc?.tsb ?? 0,
        tsbStatus,
        ctlTrend,
        rampRate: latestPmc?.rampRate ?? null,
        sport: latestPmc?.sport ?? null,
      },
      todaysPlan: todaysPlannedResult.map((ps) => ({
        id: ps.id,
        sport: ps.sport,
        title: ps.title,
        purpose: ps.sessionPurpose,
        description: ps.description,
        targetDuration: ps.targetDurationSeconds,
        targetDistance: ps.targetDistanceMeters,
        targetTss: ps.targetTss,
        targetZones: ps.targetZones,
        completed: ps.completedSessionId !== null,
      })),
      yesterday: yesterdaySessionsResult.map((row) => ({
        id: row.session.id.toString(),
        sport: row.session.sport,
        title: row.session.title,
        type: row.session.sessionType,
        duration: row.session.durationSeconds,
        distance: row.session.distanceMeters,
        tss: row.session.tss,
        sessionQuality: row.session.sessionQuality,
        qualityAssessment: row.quality
          ? {
              overallScore: row.quality.overallScore,
              paceConsistency: row.quality.paceConsistency,
              hrDrift: row.quality.hrDrift,
              zoneAdherence: row.quality.zoneAdherence,
              notes: row.quality.notes,
            }
          : null,
      })),
      weekStatus: {
        totalTss,
        plannedTss,
        compliancePct,
        sessionCount: weekSessionsResult.length,
        plannedRemaining: remainingPlanned,
      },
      upcomingSessions: upcomingResult.map((ps) => ({
        id: ps.id,
        sport: ps.sport,
        title: ps.title,
        purpose: ps.sessionPurpose,
        scheduledDate: ps.scheduledDate.toISOString(),
        targetDuration: ps.targetDurationSeconds,
        targetTss: ps.targetTss,
      })),
      alerts: alertsResult.map((a) => ({
        id: a.id,
        type: a.alertType,
        severity: a.severity,
        title: a.title,
        message: a.message,
        createdAt: a.createdAt.toISOString(),
      })),
      motivation: {
        currentStreak: trainingStreak?.currentCount ?? 0,
        longestStreak: trainingStreak?.longestCount ?? 0,
        ctlPctOfTarget: null as number | null,
        nextMilestone: null as string | null,
      },
      mainGoal: mainGoalResult[0]
        ? {
            id: mainGoalResult[0].id,
            title: mainGoalResult[0].title,
            targetDate: mainGoalResult[0].targetDate?.toISOString() ?? null,
            sport: mainGoalResult[0].sport,
            racePriority: mainGoalResult[0].racePriority,
            goalType: mainGoalResult[0].goalType,
          }
        : null,
      nextGoal: (() => {
        // Find the next upcoming goal that isn't the main A-race
        const mainId = mainGoalResult[0]?.id;
        const next = nextGoalResult.find((g) => g.id !== mainId);
        return next ? {
          id: next.id,
          title: next.title,
          targetDate: next.targetDate?.toISOString() ?? null,
          sport: next.sport,
          racePriority: next.racePriority,
          goalType: next.goalType,
        } : null;
      })(),
    };

    res.json({ data: response });
  } catch (error: any) {
    console.error("Fejl ved hentning af dashboard:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}
