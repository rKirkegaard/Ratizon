import { Router } from "express";
import {
  listSessions,
  getSession,
  getSessionTimeseries,
  createSession,
} from "../controllers/training.controller.js";

export const trainingRouter = Router();

// Session endpoints mounted under /api/training
// These map to /api/training/sessions/:athleteId etc.
trainingRouter.get("/sessions/:athleteId", listSessions);
trainingRouter.get("/sessions/:athleteId/:sessionId", getSession);
trainingRouter.get("/sessions/:athleteId/:sessionId/timeseries", getSessionTimeseries);
trainingRouter.post("/sessions/:athleteId", createSession);
