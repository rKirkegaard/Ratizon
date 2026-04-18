import { Router } from "express";
import {
  getSystemSettings,
  updateSystemSettings,
  getAthletePreferences,
  updateAthletePreferences,
  deleteAthletePreferences,
  getEffectivePreferences,
  getAthleteUsage,
  checkAthleteLimit,
  getModels,
} from "../controllers/llm-settings.controller.js";

export const llmSettingsRouter = Router();

// System settings
llmSettingsRouter.get("/settings", getSystemSettings);
llmSettingsRouter.put("/settings", updateSystemSettings);

// Available models
llmSettingsRouter.get("/models", getModels);

// Per-athlete preferences
llmSettingsRouter.get("/preferences/:athleteId", getAthletePreferences);
llmSettingsRouter.put("/preferences/:athleteId", updateAthletePreferences);
llmSettingsRouter.delete("/preferences/:athleteId", deleteAthletePreferences);
llmSettingsRouter.get("/preferences/:athleteId/effective", getEffectivePreferences);

// Usage stats
llmSettingsRouter.get("/usage/:athleteId", getAthleteUsage);

// Budget limit check
llmSettingsRouter.get("/limit/:athleteId", checkAthleteLimit);
