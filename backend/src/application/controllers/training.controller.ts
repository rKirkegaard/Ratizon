import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import {
  sessions,
  sessionLaps,
  sessionTrackpoints,
} from "../../infrastructure/database/schema/training.schema.js";
import { sessionAnalytics } from "../../infrastructure/database/schema/analytics.schema.js";
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";

/**
 * GET /api/sessions/:athleteId?startDate=X&endDate=Y&sport=X
 * List sessions with analytics. TSS uses COALESCE(session_analytics.tss, sessions.tss)
 */
export async function listSessions(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const { startDate, endDate, sport } = req.query;

    const conditions = [eq(sessions.athleteId, athleteId)];

    if (startDate) {
      conditions.push(gte(sessions.startedAt, new Date(startDate as string)));
    }
    if (endDate) {
      conditions.push(lte(sessions.startedAt, new Date(endDate as string)));
    }
    if (sport) {
      conditions.push(eq(sessions.sport, sport as string));
    }

    const rows = await db
      .select({
        id: sessions.id,
        athleteId: sessions.athleteId,
        plannedSessionId: sessions.plannedSessionId,
        sport: sessions.sport,
        sessionType: sessions.sessionType,
        title: sessions.title,
        startedAt: sessions.startedAt,
        durationSeconds: sessions.durationSeconds,
        distanceMeters: sessions.distanceMeters,
        tss: sql<number>`COALESCE(${sessionAnalytics.hrss}, ${sessions.tss})`,
        avgHr: sessions.avgHr,
        maxHr: sessions.maxHr,
        avgPower: sessions.avgPower,
        normalizedPower: sessions.normalizedPower,
        avgPace: sessions.avgPace,
        avgCadence: sessions.avgCadence,
        elevationGain: sessions.elevationGain,
        calories: sessions.calories,
        sessionQuality: sessions.sessionQuality,
        compliancePct: sessions.compliancePct,
        rpe: sessions.rpe,
        notes: sessions.notes,
        source: sessions.source,
        createdAt: sessions.createdAt,
        // Analytics fields
        efficiencyFactor: sessionAnalytics.efficiencyFactor,
        decoupling: sessionAnalytics.decoupling,
        intensityFactor: sessionAnalytics.intensityFactor,
        variabilityIndex: sessionAnalytics.variabilityIndex,
        zone1Seconds: sessionAnalytics.zone1Seconds,
        zone2Seconds: sessionAnalytics.zone2Seconds,
        zone3Seconds: sessionAnalytics.zone3Seconds,
        zone4Seconds: sessionAnalytics.zone4Seconds,
        zone5Seconds: sessionAnalytics.zone5Seconds,
        trimp: sessionAnalytics.trimp,
        hrss: sessionAnalytics.hrss,
      })
      .from(sessions)
      .leftJoin(sessionAnalytics, eq(sessions.id, sessionAnalytics.sessionId))
      .where(and(...conditions))
      .orderBy(desc(sessions.startedAt));

    const data = rows.map((r) => ({
      ...r,
      id: r.id.toString(),
    }));

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af sessioner:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * GET /api/sessions/:athleteId/:sessionId
 * Get single session with full analytics + laps
 */
export async function getSession(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const sessionId = req.params.sessionId as string;

    const [sessionRow] = await db
      .select({
        session: sessions,
        analytics: sessionAnalytics,
      })
      .from(sessions)
      .leftJoin(sessionAnalytics, eq(sessions.id, sessionAnalytics.sessionId))
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          eq(sessions.id, BigInt(sessionId))
        )
      )
      .limit(1);

    if (!sessionRow) {
      res.status(404).json({ error: "Session ikke fundet" });
      return;
    }

    // Get laps
    const laps = await db
      .select()
      .from(sessionLaps)
      .where(eq(sessionLaps.sessionId, BigInt(sessionId)))
      .orderBy(asc(sessionLaps.lapNumber));

    const data = {
      ...sessionRow.session,
      id: sessionRow.session.id.toString(),
      tss:
        sessionRow.analytics?.hrss ??
        sessionRow.session.tss,
      analytics: sessionRow.analytics
        ? {
            efficiencyFactor: sessionRow.analytics.efficiencyFactor,
            decoupling: sessionRow.analytics.decoupling,
            intensityFactor: sessionRow.analytics.intensityFactor,
            variabilityIndex: sessionRow.analytics.variabilityIndex,
            zone1Seconds: sessionRow.analytics.zone1Seconds,
            zone2Seconds: sessionRow.analytics.zone2Seconds,
            zone3Seconds: sessionRow.analytics.zone3Seconds,
            zone4Seconds: sessionRow.analytics.zone4Seconds,
            zone5Seconds: sessionRow.analytics.zone5Seconds,
            trimp: sessionRow.analytics.trimp,
            hrss: sessionRow.analytics.hrss,
          }
        : null,
      laps: laps.map((l) => ({
        ...l,
        id: l.id.toString(),
        sessionId: l.sessionId.toString(),
      })),
    };

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af session:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * GET /api/sessions/:athleteId/:sessionId/timeseries?downsample=500
 * Get trackpoints for a session, optionally downsampled
 */
export async function getSessionTimeseries(req: Request, res: Response) {
  try {
    const sessionId = req.params.sessionId as string;
    const downsample = parseInt(req.query.downsample as string) || 500;

    // First get total count
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(sessionTrackpoints)
      .where(eq(sessionTrackpoints.sessionId, BigInt(sessionId)));

    const totalPoints = Number(countResult.count);

    if (totalPoints === 0) {
      res.json({ data: [], totalPoints: 0 });
      return;
    }

    let data;
    if (totalPoints <= downsample) {
      // Return all points
      data = await db
        .select()
        .from(sessionTrackpoints)
        .where(eq(sessionTrackpoints.sessionId, BigInt(sessionId)))
        .orderBy(asc(sessionTrackpoints.timestamp));
    } else {
      // Downsample using nth-row selection
      const nth = Math.ceil(totalPoints / downsample);
      data = await db
        .select()
        .from(sessionTrackpoints)
        .where(
          and(
            eq(sessionTrackpoints.sessionId, BigInt(sessionId)),
            sql`(${sessionTrackpoints.id} - (SELECT MIN(id) FROM session_trackpoints WHERE session_id = ${BigInt(sessionId)})) % ${nth} = 0`
          )
        )
        .orderBy(asc(sessionTrackpoints.timestamp));
    }

    const mapped = data.map((tp) => ({
      ...tp,
      id: tp.id.toString(),
      sessionId: tp.sessionId.toString(),
    }));

    res.json({ data: mapped, totalPoints });
  } catch (error: any) {
    console.error("Fejl ved hentning af timeseries:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * POST /api/sessions/:athleteId
 * Create a new session (from upload or manual entry)
 */
export async function createSession(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const body = req.body;

    if (!body.sport || !body.session_type || !body.title || !body.started_at || !body.duration_seconds) {
      res.status(400).json({
        error: "Paakraevede felter: sport, session_type, title, started_at, duration_seconds",
      });
      return;
    }

    const [created] = await db
      .insert(sessions)
      .values({
        athleteId,
        plannedSessionId: body.planned_session_id ?? null,
        sport: body.sport,
        sessionType: body.session_type,
        title: body.title,
        startedAt: new Date(body.started_at),
        durationSeconds: body.duration_seconds,
        distanceMeters: body.distance_meters ?? null,
        tss: body.tss ?? null,
        avgHr: body.avg_hr ?? null,
        maxHr: body.max_hr ?? null,
        avgPower: body.avg_power ?? null,
        normalizedPower: body.normalized_power ?? null,
        avgPace: body.avg_pace ?? null,
        avgCadence: body.avg_cadence ?? null,
        elevationGain: body.elevation_gain ?? null,
        calories: body.calories ?? null,
        sessionQuality: body.session_quality ?? null,
        compliancePct: body.compliance_pct ?? null,
        rpe: body.rpe ?? null,
        notes: body.notes ?? null,
        source: body.source ?? "manual",
        externalId: body.external_id ?? null,
      })
      .returning();

    res.status(201).json({
      data: {
        ...created,
        id: created.id.toString(),
      },
    });
  } catch (error: any) {
    console.error("Fejl ved oprettelse af session:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * PATCH /api/training/sessions/:athleteId/:sessionId
 * Update session fields (sessionType, notes, rpe, etc.)
 */
export async function updateSession(req: Request, res: Response) {
  try {
    const { athleteId, sessionId } = req.params;
    const body = req.body;

    const updates: Record<string, unknown> = {};
    if (body.sessionType !== undefined) updates.sessionType = body.sessionType;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.rpe !== undefined) updates.rpe = body.rpe;
    if (body.sessionQuality !== undefined) updates.sessionQuality = body.sessionQuality;
    if (body.title !== undefined) updates.title = body.title;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Ingen felter at opdatere" });
      return;
    }

    const [updated] = await db
      .update(sessions)
      .set(updates)
      .where(and(eq(sessions.id, BigInt(sessionId)), eq(sessions.athleteId, athleteId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Session ikke fundet" });
      return;
    }

    res.json({ data: { ...updated, id: updated.id.toString() } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}
