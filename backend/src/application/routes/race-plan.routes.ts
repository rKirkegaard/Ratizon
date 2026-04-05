import { Router } from "express";
import {
  listRacePlans,
  getRacePlan,
  createRacePlan,
  updateRacePlan,
  deleteRacePlan,
  createNutritionItem,
  deleteNutritionItem,
  getRaceTimeline,
} from "../controllers/race-plan.controller.js";

export const racePlanRouter = Router();

racePlanRouter.get("/:athleteId/race-plans", listRacePlans);
racePlanRouter.get("/:athleteId/race-plans/:id", getRacePlan);
racePlanRouter.post("/:athleteId/race-plans", createRacePlan);
racePlanRouter.put("/:athleteId/race-plans/:id", updateRacePlan);
racePlanRouter.delete("/:athleteId/race-plans/:id", deleteRacePlan);

// Nutrition items
racePlanRouter.post("/:athleteId/race-plans/:id/nutrition", createNutritionItem);
racePlanRouter.delete("/:athleteId/race-plans/:id/nutrition/:itemId", deleteNutritionItem);

// Timeline
racePlanRouter.get("/:athleteId/race-plans/:id/timeline", getRaceTimeline);
