import { Router } from "express";
import {
  getPmcHistory,
  recalculatePmc,
} from "../controllers/analytics.controller.js";

export const analyticsRouter = Router();

analyticsRouter.get("/:athleteId/pmc", getPmcHistory);
analyticsRouter.post("/:athleteId/pmc/recalculate", recalculatePmc);
