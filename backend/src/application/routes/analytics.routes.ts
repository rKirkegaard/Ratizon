import { Router } from "express";
import {
  getPmcHistory,
  recalculatePmc,
  getWeeklyReport,
  getEfTrend,
  getPaceAtHr,
  getPowerAtHr,
  getRampRate,
  getMonotony,
  getSportBalance,
} from "../controllers/analytics.controller.js";

export const analyticsRouter = Router();

// Existing PMC endpoints
analyticsRouter.get("/:athleteId/pmc", getPmcHistory);
analyticsRouter.post("/:athleteId/pmc/recalculate", recalculatePmc);

// Fase 2 — Weekly Report
analyticsRouter.get("/:athleteId/weekly", getWeeklyReport);

// Fase 2 — Performance
analyticsRouter.get("/:athleteId/ef-trend", getEfTrend);
analyticsRouter.get("/:athleteId/pace-at-hr", getPaceAtHr);
analyticsRouter.get("/:athleteId/power-at-hr", getPowerAtHr);

// Fase 2 — Load & Recovery
analyticsRouter.get("/:athleteId/ramp-rate", getRampRate);
analyticsRouter.get("/:athleteId/monotony", getMonotony);
analyticsRouter.get("/:athleteId/sport-balance", getSportBalance);
