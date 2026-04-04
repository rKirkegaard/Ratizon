import { Router } from "express";
import {
  upsertWellness,
  getLatestWellness,
  getWellnessHistory,
  getHrvGate,
} from "../controllers/wellness.controller.js";

export const wellnessRouter = Router();

wellnessRouter.post("/:athleteId", upsertWellness);
wellnessRouter.get("/:athleteId/latest", getLatestWellness);
wellnessRouter.get("/:athleteId/history", getWellnessHistory);
wellnessRouter.get("/:athleteId/hrv-gate", getHrvGate);
