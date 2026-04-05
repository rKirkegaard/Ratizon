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

// ── Budgets (stub) ────────────────────────────────────────────────────
planningRouter.get("/:athleteId/budgets", (req: Request, res: Response) => {
  res.json({ data: [], message: `Ugebudgetter for atlet ${req.params.athleteId} hentet` });
});
