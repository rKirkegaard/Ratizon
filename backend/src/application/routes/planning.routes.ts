import { Router, Request, Response } from "express";
import {
  listPlannedSessions,
  createPlannedSession,
  updatePlannedSession,
  deletePlannedSession,
  movePlannedSession,
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

// ── Existing stubs ─────────────────────────────────────────────────────
planningRouter.get("/goals/:athleteId", (req: Request, res: Response) => {
  res.json({ data: [], message: `Maal for atlet ${req.params.athleteId} hentet` });
});

planningRouter.get("/phases/:athleteId", (req: Request, res: Response) => {
  res.json({ data: [], message: `Traeningsfaser for atlet ${req.params.athleteId} hentet` });
});

planningRouter.get("/budgets/:athleteId", (req: Request, res: Response) => {
  res.json({ data: [], message: `Ugebudgetter for atlet ${req.params.athleteId} hentet` });
});
