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
  getRunningCadenceDistribution,
  getRunningGCTBalance,
  getRunningVerticalRatio,
  getCyclingPowerCurve,
  getCyclingZoneDistribution,
  getCyclingCadencePower,
  getSwimPaceProgression,
  getSwimSwolfTrend,
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

// Fase 3 — Running
analyticsRouter.get("/:athleteId/running/cadence-distribution", getRunningCadenceDistribution);
analyticsRouter.get("/:athleteId/running/gct-balance", getRunningGCTBalance);
analyticsRouter.get("/:athleteId/running/vertical-ratio", getRunningVerticalRatio);

// Fase 3 — Cycling
analyticsRouter.get("/:athleteId/cycling/power-curve", getCyclingPowerCurve);
analyticsRouter.get("/:athleteId/cycling/zone-distribution", getCyclingZoneDistribution);
analyticsRouter.get("/:athleteId/cycling/cadence-power", getCyclingCadencePower);

// Fase 3 — Swimming
analyticsRouter.get("/:athleteId/swimming/pace-progression", getSwimPaceProgression);
analyticsRouter.get("/:athleteId/swimming/swolf-trend", getSwimSwolfTrend);
