export interface AiDailyBriefing {
  id: string;
  athleteId: string;
  date: string;
  summary: string;
  recommendations: string[];
  warnings: string[];
  focusAreas: string[];
  generatedAt: string;
}

export interface AiSessionFeedback {
  id: string;
  sessionId: string;
  overallAssessment: string;
  strengths: string[];
  improvements: string[];
  nextSessionSuggestion: string | null;
  generatedAt: string;
}

export interface AiAlert {
  id: string;
  athleteId: string;
  ruleId: string | null;
  alertType: "overtraining" | "undertraining" | "injury_risk" | "plateau" | "milestone" | "custom";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

export interface AlertRule {
  id: string;
  athleteId: string;
  ruleName: string;
  ruleType: string;
  thresholds: Record<string, number>;
  enabled: boolean;
  createdAt: string;
}

export interface AiSuggestionLog {
  id: string;
  athleteId: string;
  suggestionType: string;
  suggestion: string;
  accepted: boolean | null;
  feedback: string | null;
  createdAt: string;
}

export interface AiCoachingPreferences {
  id: string;
  athleteId: string;
  communicationStyle: "concise" | "detailed" | "motivational";
  language: string;
  focusAreas: string[];
  autoSuggestions: boolean;
}

export interface ChatConversation {
  id: string;
  athleteId: string;
  title: string;
  contextType: string | null;
  contextPage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  contextType: string | null;
  contextPage: string | null;
  createdAt: string;
}

export interface CoachNote {
  id: string;
  coachId: string;
  athleteId: string;
  sessionId: string | null;
  content: string;
  visibility: "private" | "shared";
  createdAt: string;
  updatedAt: string;
}
