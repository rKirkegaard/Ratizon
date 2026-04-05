import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { sessionBricks, brickSegments } from "../../infrastructure/database/schema/brick.schema.js";
import { sessions, sessionTrackpoints } from "../../infrastructure/database/schema/training.schema.js";
import { detectBricks, type SessionForDetection } from "../../domain/services/BrickDetector.js";
import { eq, and, gte, lte, asc, desc, sql } from "drizzle-orm";

// ── GET /api/training/bricks/:athleteId ─────────────────────────────────

export async function listBricks(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { startDate, endDate } = req.query;

    const conditions = [eq(sessionBricks.athleteId, athleteId)];
    if (startDate) conditions.push(gte(sessionBricks.startedAt, new Date(startDate as string)));
    if (endDate) conditions.push(lte(sessionBricks.startedAt, new Date(endDate as string)));

    const bricks = await db
      .select()
      .from(sessionBricks)
      .where(and(...conditions))
      .orderBy(desc(sessionBricks.startedAt));

    // Fetch segments for all bricks
    const brickIds = bricks.map((b) => b.id);
    const allSegments = brickIds.length > 0
      ? await db
          .select()
          .from(brickSegments)
          .where(sql`${brickSegments.brickId} = ANY(ARRAY[${sql.join(brickIds.map(id => sql`${id}::uuid`), sql`, `)}])`)
          .orderBy(asc(brickSegments.segmentOrder))
      : [];

    const segmentsByBrick = new Map<string, typeof allSegments>();
    for (const seg of allSegments) {
      const arr = segmentsByBrick.get(seg.brickId) || [];
      arr.push(seg);
      segmentsByBrick.set(seg.brickId, arr);
    }

    res.json({
      data: bricks.map((b) => ({
        ...b,
        startedAt: b.startedAt.toISOString(),
        createdAt: b.createdAt.toISOString(),
        segments: (segmentsByBrick.get(b.id) || []).map((s) => ({
          id: s.id,
          sessionId: s.sessionId.toString(),
          segmentOrder: s.segmentOrder,
          sport: s.sport,
        })),
      })),
    });
  } catch (error: any) {
    console.error("Fejl ved hentning af bricks:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ── GET /api/training/bricks/:athleteId/:brickId ────────────────────────

export async function getBrickDetail(req: Request, res: Response) {
  try {
    const { athleteId, brickId } = req.params;

    const [brick] = await db
      .select()
      .from(sessionBricks)
      .where(and(eq(sessionBricks.id, brickId), eq(sessionBricks.athleteId, athleteId)))
      .limit(1);

    if (!brick) {
      res.status(404).json({ error: "Brick ikke fundet" });
      return;
    }

    const segments = await db
      .select()
      .from(brickSegments)
      .where(eq(brickSegments.brickId, brickId))
      .orderBy(asc(brickSegments.segmentOrder));

    // Fetch full session data for each segment
    const segmentData = [];
    for (const seg of segments) {
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, seg.sessionId))
        .limit(1);

      segmentData.push({
        id: seg.id,
        segmentOrder: seg.segmentOrder,
        sport: seg.sport,
        session: session
          ? {
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
              avgPace: session.avgPace,
              avgCadence: session.avgCadence,
            }
          : null,
      });
    }

    res.json({
      data: {
        ...brick,
        startedAt: brick.startedAt.toISOString(),
        createdAt: brick.createdAt.toISOString(),
        segments: segmentData,
      },
    });
  } catch (error: any) {
    console.error("Fejl ved hentning af brick detaljer:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ── POST /api/training/bricks/:athleteId ────────────────────────────────

export async function createBrick(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { sessionIds, title } = req.body;

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length < 2) {
      res.status(400).json({ error: "Mindst 2 session-ID'er er paakraeved" });
      return;
    }

    // Fetch sessions
    const sessionRows = [];
    for (const id of sessionIds) {
      const [s] = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.id, BigInt(id)), eq(sessions.athleteId, athleteId)))
        .limit(1);
      if (s) sessionRows.push(s);
    }

    if (sessionRows.length < 2) {
      res.status(400).json({ error: "Kunne ikke finde nok sessioner" });
      return;
    }

    // Sort by start time
    sessionRows.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

    const sports = sessionRows.map((s) => s.sport);
    const brickType = sports.join("-");
    const totalDuration = sessionRows.reduce((sum, s) => sum + s.durationSeconds, 0);
    const totalDistance = sessionRows.reduce((sum, s) => sum + (s.distanceMeters ?? 0), 0);
    const totalTss = sessionRows.reduce((sum, s) => sum + (s.tss ?? 0), 0);

    // Compute transitions
    let t1: number | null = null;
    let t2: number | null = null;
    if (sessionRows.length >= 2) {
      const end0 = sessionRows[0].startedAt.getTime() + sessionRows[0].durationSeconds * 1000;
      t1 = Math.max(0, Math.round((sessionRows[1].startedAt.getTime() - end0) / 1000));
    }
    if (sessionRows.length >= 3) {
      const end1 = sessionRows[1].startedAt.getTime() + sessionRows[1].durationSeconds * 1000;
      t2 = Math.max(0, Math.round((sessionRows[2].startedAt.getTime() - end1) / 1000));
    }

    const [brick] = await db
      .insert(sessionBricks)
      .values({
        athleteId,
        title: title || sports.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" + ") + " Brick",
        brickType,
        startedAt: sessionRows[0].startedAt,
        totalDurationSeconds: totalDuration,
        totalDistanceMeters: totalDistance,
        totalTss: Math.round(totalTss * 10) / 10,
        t1Seconds: t1,
        t2Seconds: t2,
        autoDetected: false,
      })
      .returning();

    // Insert segments
    for (let i = 0; i < sessionRows.length; i++) {
      await db.insert(brickSegments).values({
        brickId: brick.id,
        sessionId: sessionRows[i].id,
        segmentOrder: i + 1,
        sport: sessionRows[i].sport,
      });
    }

    res.status(201).json({
      data: {
        ...brick,
        startedAt: brick.startedAt.toISOString(),
        createdAt: brick.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Fejl ved oprettelse af brick:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ── POST /api/training/bricks/:athleteId/detect ─────────────────────────

export async function detectBricksEndpoint(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { startDate, endDate } = req.body;

    const since = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const until = endDate ? new Date(endDate) : new Date();

    // Fetch all sessions in range
    const allSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.athleteId, athleteId),
          gte(sessions.startedAt, since),
          lte(sessions.startedAt, until)
        )
      )
      .orderBy(asc(sessions.startedAt));

    // Group by date
    const byDate = new Map<string, typeof allSessions>();
    for (const s of allSessions) {
      const dateKey = s.startedAt.toISOString().split("T")[0];
      const arr = byDate.get(dateKey) || [];
      arr.push(s);
      byDate.set(dateKey, arr);
    }

    // Detect bricks per day
    const detectedBricks: Array<{
      brickType: string;
      title: string;
      startedAt: string;
      sessions: string[];
      transitions: number[];
    }> = [];

    // Get existing brick session IDs to avoid duplicates
    const existingSegments = await db
      .select({ sessionId: brickSegments.sessionId })
      .from(brickSegments)
      .innerJoin(sessionBricks, eq(brickSegments.brickId, sessionBricks.id))
      .where(eq(sessionBricks.athleteId, athleteId));
    const existingSessionIds = new Set(existingSegments.map((s) => s.sessionId.toString()));

    let created = 0;

    for (const [, daySessions] of byDate) {
      if (daySessions.length < 2) continue;

      // Filter out sessions already in bricks
      const available = daySessions.filter(
        (s) => !existingSessionIds.has(s.id.toString())
      );
      if (available.length < 2) continue;

      const forDetection: SessionForDetection[] = available.map((s) => ({
        id: s.id.toString(),
        sport: s.sport,
        startedAt: s.startedAt,
        durationSeconds: s.durationSeconds,
        distanceMeters: s.distanceMeters,
        tss: s.tss,
      }));

      const found = detectBricks(forDetection);

      for (const brick of found) {
        // Create the brick
        const [inserted] = await db
          .insert(sessionBricks)
          .values({
            athleteId,
            title: brick.title,
            brickType: brick.brickType,
            startedAt: brick.startedAt,
            totalDurationSeconds: brick.totalDurationSeconds,
            totalDistanceMeters: brick.totalDistanceMeters,
            totalTss: brick.totalTss,
            t1Seconds: brick.transitions[0] ?? null,
            t2Seconds: brick.transitions[1] ?? null,
            autoDetected: true,
          })
          .returning();

        for (let i = 0; i < brick.sessions.length; i++) {
          await db.insert(brickSegments).values({
            brickId: inserted.id,
            sessionId: BigInt(brick.sessions[i].id),
            segmentOrder: i + 1,
            sport: brick.sessions[i].sport,
          });
        }

        created++;
        detectedBricks.push({
          brickType: brick.brickType,
          title: brick.title,
          startedAt: brick.startedAt.toISOString(),
          sessions: brick.sessions.map((s) => s.id),
          transitions: brick.transitions,
        });
      }
    }

    res.json({
      data: {
        detected: detectedBricks.length,
        created,
        bricks: detectedBricks,
      },
    });
  } catch (error: any) {
    console.error("Fejl ved brick-detektion:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ── DELETE /api/training/bricks/:athleteId/:brickId ─────────────────────

export async function deleteBrick(req: Request, res: Response) {
  try {
    const { athleteId, brickId } = req.params;

    const [deleted] = await db
      .delete(sessionBricks)
      .where(and(eq(sessionBricks.id, brickId), eq(sessionBricks.athleteId, athleteId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Brick ikke fundet" });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    console.error("Fejl ved sletning af brick:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ── GET /api/training/bricks/:athleteId/:brickId/transition ─────────────

export async function getBrickTransition(req: Request, res: Response) {
  try {
    const { athleteId, brickId } = req.params;

    const [brick] = await db
      .select()
      .from(sessionBricks)
      .where(and(eq(sessionBricks.id, brickId), eq(sessionBricks.athleteId, athleteId)))
      .limit(1);

    if (!brick) {
      res.status(404).json({ error: "Brick ikke fundet" });
      return;
    }

    const segments = await db
      .select()
      .from(brickSegments)
      .where(eq(brickSegments.brickId, brickId))
      .orderBy(asc(brickSegments.segmentOrder));

    // For bike→run bricks: get first 15 min of run segment trackpoints
    const runSegment = segments.find((s) => s.sport === "run");
    let runFirst15Min: Array<{ offsetSec: number; hr: number | null; speed: number | null }> = [];

    if (runSegment) {
      const trackpoints = await db
        .select({
          timestampOffset: sessionTrackpoints.timestampOffsetS,
          hr: sessionTrackpoints.heartRateBpm,
          speed: sessionTrackpoints.speedMps,
        })
        .from(sessionTrackpoints)
        .where(
          and(
            eq(sessionTrackpoints.sessionId, runSegment.sessionId),
            lte(sessionTrackpoints.timestampOffsetS, 900) // first 15 min
          )
        )
        .orderBy(asc(sessionTrackpoints.timestampOffsetS));

      runFirst15Min = trackpoints.map((tp) => ({
        offsetSec: tp.timestampOffset,
        hr: tp.hr,
        speed: tp.speed,
      }));
    }

    res.json({
      data: {
        brickId: brick.id,
        brickType: brick.brickType,
        t1Seconds: brick.t1Seconds,
        t2Seconds: brick.t2Seconds,
        segments: segments.map((s) => ({
          segmentOrder: s.segmentOrder,
          sport: s.sport,
          sessionId: s.sessionId.toString(),
        })),
        runFirst15Min,
      },
    });
  } catch (error: any) {
    console.error("Fejl ved hentning af brick transition:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}
