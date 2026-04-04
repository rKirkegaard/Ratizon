import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { plannedSessions } from "../../infrastructure/database/schema/training.schema.js";
import { goals, athleteTrainingPhases } from "../../infrastructure/database/schema/planning.schema.js";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

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

// ── Goals ─────────────────────────────────────────────────────────────────

/**
 * GET /api/planning/:athleteId/goals
 * List goals sorted by target_date
 */
export async function listGoals(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;

    const rows = await db
      .select()
      .from(goals)
      .where(eq(goals.athleteId, athleteId))
      .orderBy(asc(goals.targetDate));

    res.json({ data: rows });
  } catch (error: any) {
    console.error("Fejl ved hentning af maal:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * POST /api/planning/:athleteId/goals
 * Create a new goal
 */
export async function createGoal(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const body = req.body;

    if (!body.title || !body.goalType) {
      res.status(400).json({ error: "Paakraevede felter: title, goalType" });
      return;
    }

    const [created] = await db
      .insert(goals)
      .values({
        athleteId,
        title: body.title,
        goalType: body.goalType,
        sport: body.sport ?? null,
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
        raceDistance: body.raceDistance ?? null,
        raceTargetTime: body.raceTargetTime ?? null,
        racePriority: body.racePriority ?? null,
        status: body.status ?? "active",
        notes: body.notes ?? null,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (error: any) {
    console.error("Fejl ved oprettelse af maal:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * PUT /api/planning/:athleteId/goals/:id
 * Update a goal
 */
export async function updateGoal(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const id = req.params.id as string;
    const body = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.goalType !== undefined) updateData.goalType = body.goalType;
    if (body.sport !== undefined) updateData.sport = body.sport;
    if (body.targetDate !== undefined)
      updateData.targetDate = body.targetDate ? new Date(body.targetDate) : null;
    if (body.raceDistance !== undefined) updateData.raceDistance = body.raceDistance;
    if (body.raceTargetTime !== undefined) updateData.raceTargetTime = body.raceTargetTime;
    if (body.racePriority !== undefined) updateData.racePriority = body.racePriority;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const [updated] = await db
      .update(goals)
      .set(updateData)
      .where(and(eq(goals.id, id), eq(goals.athleteId, athleteId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Maal ikke fundet" });
      return;
    }

    res.json({ data: updated });
  } catch (error: any) {
    console.error("Fejl ved opdatering af maal:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * DELETE /api/planning/:athleteId/goals/:id
 * Delete a goal
 */
export async function deleteGoal(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const id = req.params.id as string;

    const [deleted] = await db
      .delete(goals)
      .where(and(eq(goals.id, id), eq(goals.athleteId, athleteId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Maal ikke fundet" });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    console.error("Fejl ved sletning af maal:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ── Training Phases ───────────────────────────────────────────────────────

/**
 * GET /api/planning/:athleteId/phases
 * List training phases sorted by phase number
 */
export async function listPhases(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;

    const rows = await db
      .select()
      .from(athleteTrainingPhases)
      .where(eq(athleteTrainingPhases.athleteId, athleteId))
      .orderBy(asc(athleteTrainingPhases.phaseNumber));

    res.json({ data: rows });
  } catch (error: any) {
    console.error("Fejl ved hentning af traeningsfaser:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * POST /api/planning/:athleteId/phases
 * Create a new training phase
 */
export async function createPhase(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const body = req.body;

    if (!body.phaseName || !body.phaseType || !body.startDate || !body.endDate) {
      res.status(400).json({
        error: "Paakraevede felter: phaseName, phaseType, startDate, endDate",
      });
      return;
    }

    const [created] = await db
      .insert(athleteTrainingPhases)
      .values({
        athleteId,
        goalId: body.goalId ?? null,
        phaseNumber: body.phaseNumber ?? 1,
        phaseName: body.phaseName,
        phaseType: body.phaseType,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        ctlTarget: body.ctlTarget ?? null,
        weeklyHoursTarget: body.weeklyHoursTarget ?? null,
        disciplineSplit: body.disciplineSplit ?? null,
        notes: body.notes ?? null,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (error: any) {
    console.error("Fejl ved oprettelse af traeningsfase:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}
