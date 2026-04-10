import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { plannedSessions, sessions } from "../../infrastructure/database/schema/training.schema.js";
import { goals, athleteTrainingPhases, weeklyBudgets } from "../../infrastructure/database/schema/planning.schema.js";
import { athletePmc } from "../../infrastructure/database/schema/analytics.schema.js";
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";
import { generateTaper, type TaperProfile } from "../../domain/services/TaperCalculator.js";

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
        sessionBlocks: body.session_blocks ?? null,
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
    if (body.session_blocks !== undefined) updateData.sessionBlocks = body.session_blocks;

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
        swimTargetTime: body.swimTargetTime ?? null,
        bikeTargetTime: body.bikeTargetTime ?? null,
        runTargetTime: body.runTargetTime ?? null,
        t1TargetTime: body.t1TargetTime ?? null,
        t2TargetTime: body.t2TargetTime ?? null,
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
    if (body.swimTargetTime !== undefined) updateData.swimTargetTime = body.swimTargetTime;
    if (body.bikeTargetTime !== undefined) updateData.bikeTargetTime = body.bikeTargetTime;
    if (body.runTargetTime !== undefined) updateData.runTargetTime = body.runTargetTime;
    if (body.t1TargetTime !== undefined) updateData.t1TargetTime = body.t1TargetTime;
    if (body.t2TargetTime !== undefined) updateData.t2TargetTime = body.t2TargetTime;
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

// ── Mesocycle View ────────────────────────────────────────────────────────

/**
 * GET /api/planning/:athleteId/mesocycle
 * Returns combined data for the mesocycle timeline view:
 * phases, CTL time series, weekly actuals vs budgets, phase compliance
 */
export async function getMesocycle(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;

    // 1. Get all phases
    const phases = await db
      .select()
      .from(athleteTrainingPhases)
      .where(eq(athleteTrainingPhases.athleteId, athleteId))
      .orderBy(asc(athleteTrainingPhases.startDate));

    // 2. Get CTL time series (sport='all' or latest per date)
    const ctlSeries = await db
      .select({
        date: athletePmc.date,
        ctl: athletePmc.ctl,
        atl: athletePmc.atl,
        tsb: athletePmc.tsb,
        sport: athletePmc.sport,
      })
      .from(athletePmc)
      .where(
        and(
          eq(athletePmc.athleteId, athleteId),
          eq(athletePmc.sport, "all")
        )
      )
      .orderBy(asc(athletePmc.date));

    // 3. Get weekly session actuals (aggregated by ISO week)
    const weeklyActuals = await db.execute(sql`
      SELECT
        date_trunc('week', started_at)::date AS week_start,
        COUNT(*)::int AS session_count,
        ROUND(SUM(duration_seconds)::numeric / 3600, 2) AS total_hours,
        ROUND(COALESCE(SUM(tss), 0)::numeric, 1) AS total_tss,
        ROUND(SUM(CASE WHEN sport = 'swim' THEN duration_seconds ELSE 0 END)::numeric / 3600, 2) AS swim_hours,
        ROUND(SUM(CASE WHEN sport = 'bike' THEN duration_seconds ELSE 0 END)::numeric / 3600, 2) AS bike_hours,
        ROUND(SUM(CASE WHEN sport = 'run' THEN duration_seconds ELSE 0 END)::numeric / 3600, 2) AS run_hours,
        ROUND(SUM(CASE WHEN sport = 'strength' THEN duration_seconds ELSE 0 END)::numeric / 3600, 2) AS strength_hours
      FROM sessions
      WHERE athlete_id = ${athleteId}
      GROUP BY date_trunc('week', started_at)
      ORDER BY week_start
    `);

    // 4. Get weekly budgets
    const budgets = await db
      .select()
      .from(weeklyBudgets)
      .where(eq(weeklyBudgets.athleteId, athleteId))
      .orderBy(asc(weeklyBudgets.weekStartDate));

    // 5. Get main goal
    const [mainGoal] = await db
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.athleteId, athleteId),
          eq(goals.status, "active"),
          eq(goals.racePriority, "A")
        )
      )
      .orderBy(asc(goals.targetDate))
      .limit(1);

    // 6. Compute phase compliance
    const phaseCompliance = phases.map((phase) => {
      const phaseStart = phase.startDate;
      const phaseEnd = phase.endDate;

      // Sum actual hours from weeklyActuals within this phase
      const rows = (weeklyActuals.rows || weeklyActuals) as any[];
      const actualHours = rows
        .filter((w: any) => {
          const ws = new Date(w.week_start);
          return ws >= phaseStart && ws <= phaseEnd;
        })
        .reduce((sum: number, w: any) => sum + (parseFloat(w.total_hours) || 0), 0);

      const targetWeeks = Math.max(1, Math.ceil(
        (phaseEnd.getTime() - phaseStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
      ));
      const targetHours = (phase.weeklyHoursTarget ?? 0) * targetWeeks;

      return {
        phaseId: phase.id,
        phaseName: phase.phaseName,
        phaseType: phase.phaseType,
        startDate: phaseStart.toISOString(),
        endDate: phaseEnd.toISOString(),
        ctlTarget: phase.ctlTarget,
        weeklyHoursTarget: phase.weeklyHoursTarget,
        targetHours: Math.round(targetHours * 10) / 10,
        actualHours: Math.round(actualHours * 10) / 10,
        compliancePct: targetHours > 0
          ? Math.round((actualHours / targetHours) * 100)
          : 0,
      };
    });

    res.json({
      data: {
        phases: phases.map((p) => ({
          id: p.id,
          phaseName: p.phaseName,
          phaseType: p.phaseType,
          phaseNumber: p.phaseNumber,
          startDate: p.startDate.toISOString(),
          endDate: p.endDate.toISOString(),
          ctlTarget: p.ctlTarget,
          weeklyHoursTarget: p.weeklyHoursTarget,
          disciplineSplit: p.disciplineSplit,
        })),
        ctlTimeSeries: ctlSeries.map((row) => ({
          date: row.date.toISOString(),
          ctl: row.ctl ?? 0,
          atl: row.atl ?? 0,
          tsb: row.tsb ?? 0,
        })),
        weeklyActuals: ((weeklyActuals.rows || weeklyActuals) as any[]).map((w: any) => ({
          weekStart: w.week_start,
          totalHours: parseFloat(w.total_hours) || 0,
          totalTss: parseFloat(w.total_tss) || 0,
          sessionCount: w.session_count || 0,
          swimHours: parseFloat(w.swim_hours) || 0,
          bikeHours: parseFloat(w.bike_hours) || 0,
          runHours: parseFloat(w.run_hours) || 0,
          strengthHours: parseFloat(w.strength_hours) || 0,
        })),
        weeklyBudgets: budgets.map((b) => ({
          weekStart: b.weekStartDate.toISOString(),
          totalHours: b.totalHours,
          targetTss: b.targetTss,
          swimHours: b.swimHours,
          bikeHours: b.bikeHours,
          runHours: b.runHours,
          strengthHours: b.strengthHours,
        })),
        phaseCompliance,
        mainGoal: mainGoal
          ? {
              title: mainGoal.title,
              targetDate: mainGoal.targetDate?.toISOString() ?? null,
              racePriority: mainGoal.racePriority,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error("Fejl ved hentning af mesocycle data:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ── Taper Calculator ──────────────────────────────────────────────────────

/**
 * POST /api/planning/:athleteId/taper/generate
 * Generate a taper plan projection for a goal's race date.
 */
export async function generateTaperPlan(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const { goalId, taperWeeks = 3, profile = "moderate" } = req.body;

    // Get goal for race date
    let raceDate: Date;
    if (goalId) {
      const [goal] = await db
        .select()
        .from(goals)
        .where(and(eq(goals.id, goalId), eq(goals.athleteId, athleteId)))
        .limit(1);
      if (!goal?.targetDate) {
        res.status(400).json({ error: "Maal ikke fundet eller mangler dato" });
        return;
      }
      raceDate = goal.targetDate;
    } else {
      // Find A-priority goal
      const [goal] = await db
        .select()
        .from(goals)
        .where(and(eq(goals.athleteId, athleteId), eq(goals.racePriority, "A"), eq(goals.status, "active")))
        .orderBy(asc(goals.targetDate))
        .limit(1);
      if (!goal?.targetDate) {
        res.status(400).json({ error: "Ingen aktiv A-race fundet" });
        return;
      }
      raceDate = goal.targetDate;
    }

    // Get latest PMC
    const [latestPmc] = await db
      .select()
      .from(athletePmc)
      .where(and(eq(athletePmc.athleteId, athleteId), eq(athletePmc.sport, "all")))
      .orderBy(desc(athletePmc.date))
      .limit(1);

    const currentCTL = latestPmc?.ctl ?? 50;
    const currentATL = latestPmc?.atl ?? 60;

    // Get avg weekly TSS (last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentSessions = await db
      .select({ tss: sessions.tss })
      .from(sessions)
      .where(and(eq(sessions.athleteId, athleteId), gte(sessions.startedAt, fourWeeksAgo)));

    const totalTss = recentSessions.reduce((s, r) => s + (r.tss ?? 0), 0);
    const avgWeeklyTSS = totalTss / 4;

    const plan = generateTaper({
      raceDate,
      taperWeeks: taperWeeks === 2 ? 2 : 3,
      currentWeeklyTSS: avgWeeklyTSS,
      currentCTL,
      currentATL,
      profile: profile as TaperProfile,
    });

    res.json({
      data: {
        raceDate: raceDate.toISOString(),
        currentCTL: Math.round(currentCTL * 10) / 10,
        currentATL: Math.round(currentATL * 10) / 10,
        avgWeeklyTSS: Math.round(avgWeeklyTSS),
        taperWeeks,
        profile,
        ...plan,
      },
    });
  } catch (error: any) {
    console.error("Fejl ved generering af taper:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}
