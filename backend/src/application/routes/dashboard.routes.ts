import { Router } from "express";
import { getDashboard } from "../controllers/dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.get("/:athleteId", getDashboard);
