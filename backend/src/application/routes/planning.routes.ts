import { Router, Request, Response } from "express";
import {
  listPlannedSessions,
  createPlannedSession,
  updatePlannedSession,
  deletePlannedSession,
  movePlannedSession,
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  listPhases,
  createPhase,
  getMesocycle,
  generateTaperPlan,
  estimateCTL,
} from "../controllers/planning.controller.js";

export const planningRouter = Router();

planningRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", module: "planning" });
});

// ── Planned Sessions ───────────────────────────────────────────────────
planningRouter.get("/:athleteId/sessions", listPlannedSessions);
planningRouter.post("/:athleteId/sessions", createPlannedSession);
planningRouter.put("/:athleteId/sessions/:id", updatePlannedSession);
planningRouter.delete("/:athleteId/sessions/:id", deletePlannedSession);
planningRouter.put("/:athleteId/sessions/:id/move", movePlannedSession);

// ── Goals ──────────────────────────────────────────────────────────────
planningRouter.get("/:athleteId/goals", listGoals);
planningRouter.post("/:athleteId/goals", createGoal);
planningRouter.put("/:athleteId/goals/:id", updateGoal);
planningRouter.delete("/:athleteId/goals/:id", deleteGoal);

// ── Training Phases ────────────────────────────────────────────────────
planningRouter.get("/:athleteId/phases", listPhases);
planningRouter.post("/:athleteId/phases", createPhase);

// ── Mesocycle View ────────────────────────────────────────────────────
planningRouter.get("/:athleteId/mesocycle", getMesocycle);

// ── CTL Estimate ─────────────────────────────────────────────────────
planningRouter.post("/:athleteId/ctl-estimate", estimateCTL);

// ── Taper Calculator ──────────────────────────────────────────────────
planningRouter.post("/:athleteId/taper/generate", generateTaperPlan);

// ── Bulk Import ──────────────────────────────────────────────────────
planningRouter.post("/planned-sessions/import", async (req: Request, res: Response) => {
  try {
    const { athleteId, sessions: sessionList } = req.body;
    if (!athleteId || !Array.isArray(sessionList)) {
      res.status(400).json({ error: "athleteId og sessions array er paakraevet" });
      return;
    }

    const { plannedSessions } = await import("../controllers/planning.controller.js").then(() =>
      import("../../infrastructure/database/schema/training.schema.js")
    );
    const { db } = await import("../../infrastructure/database/connection.js");

    let imported = 0;
    for (const s of sessionList) {
      await db.insert(plannedSessions).values({
        athleteId,
        sport: s.sport ?? "run",
        scheduledDate: new Date(s.scheduled_date),
        sessionPurpose: s.training_type ?? "endurance",
        title: s.title ?? `${s.sport} traening`,
        description: s.description ?? null,
        targetDurationSeconds: s.duration_minutes ? s.duration_minutes * 60 : null,
        targetTss: s.tss ?? null,
        targetZones: s.target_zones ?? null,
        sessionBlocks: s.main_set ?? s.session_blocks ?? null,
        aiGenerated: false,
      });
      imported++;
    }

    res.status(201).json({ data: { imported } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Fejl ved import" });
  }
});

// ── Budgets (stub) ────────────────────────────────────────────────────
planningRouter.get("/:athleteId/budgets", (req: Request, res: Response) => {
  res.json({ data: [], message: `Ugebudgetter for atlet ${req.params.athleteId} hentet` });
});
