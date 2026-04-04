import { Router } from "express";
import {
  getDailyBriefing,
  forceGenerateBriefing,
  getSessionFeedbackRoute,
  generateSessionFeedbackRoute,
  getAlerts,
  chat,
} from "../controllers/ai-coaching.controller.js";

export const aiCoachingRouter = Router();

// Daily briefing
aiCoachingRouter.get("/:athleteId/daily-briefing", getDailyBriefing);
aiCoachingRouter.post("/:athleteId/daily-briefing/generate", forceGenerateBriefing);

// Session feedback
aiCoachingRouter.get("/:athleteId/session-feedback/:sessionId", getSessionFeedbackRoute);
aiCoachingRouter.post("/:athleteId/session-feedback/:sessionId/generate", generateSessionFeedbackRoute);

// Alerts
aiCoachingRouter.get("/:athleteId/alerts", getAlerts);

// Chat
aiCoachingRouter.post("/:athleteId/chat", chat);
