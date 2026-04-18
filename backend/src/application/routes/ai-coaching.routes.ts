import { Router } from "express";
import {
  getDailyBriefing,
  forceGenerateBriefing,
  getSessionFeedbackRoute,
  generateSessionFeedbackRoute,
  getAlerts,
  acknowledgeAlert,
  getCoachingPreferences,
  updateCoachingPreferences,
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  evaluateAlertsRoute,
  getWeeklySummaryRoute,
  generateWeeklySummaryRoute,
  getMonthlySummaryRoute,
  generateMonthlySummaryRoute,
  getCoachNotes,
  createCoachNote,
  updateCoachNote,
  deleteCoachNote,
  getSuggestions,
  logSuggestionFeedback,
  chat,
  parseTrainingPlan,
  importParsedPlan,
  getSessionDeepAnalytics,
} from "../controllers/ai-coaching.controller.js";
import { getConstraints, createConstraint, deleteConstraint } from "../controllers/constraints.controller.js";
import { generateRacePacing, generateRaceNutrition, generateRaceChecklist, generateRaceDebrief, getRaceResults, createRaceResult } from "../controllers/race-week.controller.js";
import { getMentalReadiness, getDecouplingTrend, getSeasonBenchmark, getDisciplineBalance, getNutritionPlan, getTaperPrediction, getTrainingAge } from "../controllers/advanced-analytics.controller.js";
import { getInjuries, createInjury, updateInjury, deleteInjury, generateReturnProtocol } from "../controllers/injuries.controller.js";

export const aiCoachingRouter = Router();

// Daily briefing
aiCoachingRouter.get("/:athleteId/daily-briefing", getDailyBriefing);
aiCoachingRouter.post("/:athleteId/daily-briefing/generate", forceGenerateBriefing);

// Session feedback
aiCoachingRouter.get("/:athleteId/session-feedback/:sessionId", getSessionFeedbackRoute);
aiCoachingRouter.post("/:athleteId/session-feedback/:sessionId/generate", generateSessionFeedbackRoute);

// Deep session analytics (S15)
aiCoachingRouter.get("/:athleteId/session-analytics/:sessionId", getSessionDeepAnalytics);

// Alerts
aiCoachingRouter.get("/:athleteId/alerts", getAlerts);
aiCoachingRouter.patch("/:athleteId/alerts/:alertId/acknowledge", acknowledgeAlert);
aiCoachingRouter.post("/:athleteId/alerts/evaluate", evaluateAlertsRoute);

// Coaching preferences
aiCoachingRouter.get("/:athleteId/preferences", getCoachingPreferences);
aiCoachingRouter.put("/:athleteId/preferences", updateCoachingPreferences);

// Alert rules
aiCoachingRouter.get("/:athleteId/alert-rules", getAlertRules);
aiCoachingRouter.post("/:athleteId/alert-rules", createAlertRule);
aiCoachingRouter.put("/:athleteId/alert-rules/:ruleId", updateAlertRule);
aiCoachingRouter.delete("/:athleteId/alert-rules/:ruleId", deleteAlertRule);

// Weekly summary
aiCoachingRouter.get("/:athleteId/weekly-summary", getWeeklySummaryRoute);
aiCoachingRouter.post("/:athleteId/weekly-summary/generate", generateWeeklySummaryRoute);

// Monthly summary
aiCoachingRouter.get("/:athleteId/monthly-summary", getMonthlySummaryRoute);
aiCoachingRouter.post("/:athleteId/monthly-summary/generate", generateMonthlySummaryRoute);

// Coach notes
aiCoachingRouter.get("/:athleteId/coach-notes", getCoachNotes);
aiCoachingRouter.post("/:athleteId/coach-notes", createCoachNote);
aiCoachingRouter.put("/:athleteId/coach-notes/:noteId", updateCoachNote);
aiCoachingRouter.delete("/:athleteId/coach-notes/:noteId", deleteCoachNote);

// Suggestion log
aiCoachingRouter.get("/:athleteId/suggestions", getSuggestions);
aiCoachingRouter.post("/:athleteId/suggestions/:suggestionId/feedback", logSuggestionFeedback);

// Chat
aiCoachingRouter.post("/:athleteId/chat", chat);

// AI Training Plan Import
aiCoachingRouter.post("/:athleteId/parse-plan", parseTrainingPlan);
aiCoachingRouter.post("/:athleteId/import-plan", importParsedPlan);

// Training Constraints (S21)
aiCoachingRouter.get("/:athleteId/constraints", getConstraints);
aiCoachingRouter.post("/:athleteId/constraints", createConstraint);
aiCoachingRouter.delete("/:athleteId/constraints/:id", deleteConstraint);

// Race-Week Module (S22)
aiCoachingRouter.post("/:athleteId/race-pacing/:goalId", generateRacePacing);
aiCoachingRouter.post("/:athleteId/race-nutrition/:goalId", generateRaceNutrition);
aiCoachingRouter.post("/:athleteId/race-checklist/:goalId", generateRaceChecklist);
aiCoachingRouter.post("/:athleteId/race-debrief/:goalId", generateRaceDebrief);

// Race Results (S24a)
aiCoachingRouter.get("/:athleteId/race-results", getRaceResults);
aiCoachingRouter.post("/:athleteId/race-results", createRaceResult);

// Mental Readiness (S27)
aiCoachingRouter.get("/:athleteId/mental-readiness", getMentalReadiness);

// Advanced Analytics (S28)
aiCoachingRouter.get("/:athleteId/decoupling-trend", getDecouplingTrend);
aiCoachingRouter.get("/:athleteId/season-benchmark", getSeasonBenchmark);
aiCoachingRouter.get("/:athleteId/discipline-balance", getDisciplineBalance);

// Nutrition Plan (S26)
aiCoachingRouter.post("/:athleteId/nutrition-plan", getNutritionPlan);

// Taper Prediction (S28c)
aiCoachingRouter.get("/:athleteId/taper-prediction", getTaperPrediction);

// Training Age (S28e)
aiCoachingRouter.get("/:athleteId/training-age", getTrainingAge);

// Injuries (S25)
aiCoachingRouter.get("/:athleteId/injuries", getInjuries);
aiCoachingRouter.post("/:athleteId/injuries", createInjury);
aiCoachingRouter.put("/:athleteId/injuries/:id", updateInjury);
aiCoachingRouter.delete("/:athleteId/injuries/:id", deleteInjury);
aiCoachingRouter.post("/:athleteId/injuries/:id/return-protocol", generateReturnProtocol);
