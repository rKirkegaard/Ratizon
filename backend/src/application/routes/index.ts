import type { Express } from "express";
import { athleteRouter } from "./athlete.routes.js";
import { trainingRouter } from "./training.routes.js";
import { analyticsRouter } from "./analytics.routes.js";
import { planningRouter } from "./planning.routes.js";
import { wellnessRouter } from "./wellness.routes.js";
import { dashboardRouter } from "./dashboard.routes.js";
import { aiCoachingRouter } from "./ai-coaching.routes.js";
import { equipmentRouter } from "./equipment.routes.js";
import { sportRouter } from "./sport.routes.js";

export function registerRoutes(app: Express): void {
  app.use("/api/athletes", athleteRouter);
  app.use("/api/training", trainingRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/planning", planningRouter);
  app.use("/api/wellness", wellnessRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/ai-coaching", aiCoachingRouter);
  app.use("/api/equipment", equipmentRouter);
  app.use("/api/sports", sportRouter);
}
