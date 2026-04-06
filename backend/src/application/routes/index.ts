import type { Express } from "express";
import { authRouter } from "./auth.routes.js";
import { athleteRouter } from "./athlete.routes.js";
import { trainingRouter } from "./training.routes.js";
import { analyticsRouter } from "./analytics.routes.js";
import { planningRouter } from "./planning.routes.js";
import { wellnessRouter } from "./wellness.routes.js";
import { dashboardRouter } from "./dashboard.routes.js";
import { aiCoachingRouter } from "./ai-coaching.routes.js";
import { equipmentRouter } from "./equipment.routes.js";
import { sportRouter } from "./sport.routes.js";
import { garminRouter } from "./garmin.routes.js";
import { racePlanRouter } from "./race-plan.routes.js";
import { llmSettingsRouter } from "./llm-settings.routes.js";
import { testRouter } from "./test.routes.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

export function registerRoutes(app: Express): void {
  // Public routes (no auth required)
  app.use("/api/auth", authRouter);

  // Protected routes (require valid JWT)
  app.use("/api/athletes", authenticateToken, athleteRouter);
  app.use("/api/training", authenticateToken, trainingRouter);
  app.use("/api/analytics", authenticateToken, analyticsRouter);
  app.use("/api/planning", authenticateToken, planningRouter);
  app.use("/api/wellness", authenticateToken, wellnessRouter);
  app.use("/api/dashboard", authenticateToken, dashboardRouter);
  app.use("/api/ai-coaching", authenticateToken, aiCoachingRouter);
  app.use("/api/equipment", authenticateToken, equipmentRouter);
  app.use("/api/sports", authenticateToken, sportRouter);
  app.use("/api/garmin", garminRouter); // Mixed auth — handled per-route
  app.use("/api/planning", authenticateToken, racePlanRouter); // Race plan routes share /api/planning prefix
  app.use("/api/llm", authenticateToken, llmSettingsRouter);
  app.use("/api/tests", authenticateToken, testRouter);
}
