import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { plannedSessions } from "../../infrastructure/database/schema/training.schema.js";
import { eq, and, gte, lte, desc } from "drizzle-orm";

/**
 * GET /api/planning/:athleteId/sessions?startDate=X&endDate=Y
 * List planned sessions in date range
 */
export async function listPlannedSessions(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const { startDate, endDate } = req.query;

    const conditions = [eq(plannedSessions.athleteId, athleteId)];

    if (startDate) {
      conditions.push(gte(plannedSessions.scheduledDate, new Date(startDate as string)));
    }
    if (endDate) {
      conditions.push(lte(plannedSessions.scheduledDate, new Date(endDate as string)));
    }

    const rows = await db
      .select()
      .from(plannedSessions)
      .where(and(...conditions))
      .orderBy(desc(plannedSessions.scheduledDate));

    const data = rows.map((r) => ({
      ...r,
      completedSessionId: r.completedSessionId?.toString() ?? null,
    }));

    res.json({ data });
  } catch (error: any) {
    console.error("Fejl ved hentning af planlagte sessioner:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * POST /api/planning/:athleteId/sessions
 * Create a new planned session
 */
export async function createPlannedSession(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const body = req.body;

    if (!body.sport || !body.scheduled_date || !body.session_purpose || !body.title) {
      res.status(400).json({
        error: "Paakraevede felter: sport, scheduled_date, session_purpose, title",
      });
      return;
    }

    const [created] = await db
      .insert(plannedSessions)
      .values({
        athleteId,
        sport: body.sport,
        scheduledDate: new Date(body.scheduled_date),
        sessionPurpose: body.session_purpose,
        title: body.title,
        description: body.description ?? null,
        targetDurationSeconds: body.target_duration_seconds ?? null,
        targetDistanceMeters: body.target_distance_meters ?? null,
        targetTss: body.target_tss ?? null,
        targetZones: body.target_zones ?? null,
        aiGenerated: body.ai_generated ?? false,
      })
      .returning();

    res.status(201).json({
      data: {
        ...created,
        completedSessionId: created.completedSessionId?.toString() ?? null,
      },
    });
  } catch (error: any) {
    console.error("Fejl ved oprettelse af planlagt session:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * PUT /api/planning/:athleteId/sessions/:id
 * Update a planned session
 */
export async function updatePlannedSession(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const id = req.params.id as string;
    const body = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.sport !== undefined) updateData.sport = body.sport;
    if (body.scheduled_date !== undefined) updateData.scheduledDate = new Date(body.scheduled_date);
    if (body.session_purpose !== undefined) updateData.sessionPurpose = body.session_purpose;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.target_duration_seconds !== undefined) updateData.targetDurationSeconds = body.target_duration_seconds;
    if (body.target_distance_meters !== undefined) updateData.targetDistanceMeters = body.target_distance_meters;
    if (body.target_tss !== undefined) updateData.targetTss = body.target_tss;
    if (body.target_zones !== undefined) updateData.targetZones = body.target_zones;

    const [updated] = await db
      .update(plannedSessions)
      .set(updateData)
      .where(and(eq(plannedSessions.id, id), eq(plannedSessions.athleteId, athleteId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Planlagt session ikke fundet" });
      return;
    }

    res.json({
      data: {
        ...updated,
        completedSessionId: updated.completedSessionId?.toString() ?? null,
      },
    });
  } catch (error: any) {
    console.error("Fejl ved opdatering af planlagt session:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * DELETE /api/planning/:athleteId/sessions/:id
 * Delete a planned session
 */
export async function deletePlannedSession(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const id = req.params.id as string;

    const [deleted] = await db
      .delete(plannedSessions)
      .where(and(eq(plannedSessions.id, id), eq(plannedSessions.athleteId, athleteId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Planlagt session ikke fundet" });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    console.error("Fejl ved sletning af planlagt session:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * PUT /api/planning/:athleteId/sessions/:id/move
 * Move a planned session to a new date (drag-and-drop)
 */
export async function movePlannedSession(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const id = req.params.id as string;
    const { scheduled_date } = req.body;

    if (!scheduled_date) {
      res.status(400).json({ error: "Paakraeved felt: scheduled_date" });
      return;
    }

    const [updated] = await db
      .update(plannedSessions)
      .set({
        scheduledDate: new Date(scheduled_date),
        updatedAt: new Date(),
      })
      .where(and(eq(plannedSessions.id, id), eq(plannedSessions.athleteId, athleteId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Planlagt session ikke fundet" });
      return;
    }

    res.json({
      data: {
        ...updated,
        completedSessionId: updated.completedSessionId?.toString() ?? null,
      },
    });
  } catch (error: any) {
    console.error("Fejl ved flytning af planlagt session:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}
