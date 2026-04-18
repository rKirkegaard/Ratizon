import { Router } from "express";
import { getCoachTriage, draftAthleteMessage } from "../controllers/coach-triage.controller.js";
import { runEquipmentCheck } from "../controllers/advanced-analytics.controller.js";

export const coachRouter = Router();

coachRouter.get("/triage", getCoachTriage);
coachRouter.post("/draft-message/:athleteId", draftAthleteMessage);
coachRouter.post("/equipment-check", runEquipmentCheck);
