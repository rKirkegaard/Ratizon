import {
  pgTable,
  uuid,
  bigserial,
  bigint,
  text,
  varchar,
  timestamp,
  boolean,
  jsonb,
  integer,
  real,
  date,
} from "drizzle-orm/pg-core";
import { athletes } from "./athlete.schema";
import { users } from "./athlete.schema";
import { sessions } from "./training.schema";

export const aiDailyBriefings = pgTable("ai_daily_briefings", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  summary: text("summary").notNull(),
  recommendations: jsonb("recommendations").notNull(),
  warnings: jsonb("warnings").notNull(),
  focusAreas: jsonb("focus_areas").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiSessionFeedback = pgTable("ai_session_feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: bigint("session_id", { mode: "bigint" })
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  overallAssessment: text("overall_assessment").notNull(),
  strengths: jsonb("strengths").notNull(),
  improvements: jsonb("improvements").notNull(),
  nextSessionSuggestion: text("next_session_suggestion"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiAlerts = pgTable("ai_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  ruleId: uuid("rule_id"),
  alertType: varchar("alert_type", { length: 30 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  acknowledged: boolean("acknowledged").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const alertRules = pgTable("alert_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  ruleName: varchar("rule_name", { length: 100 }).notNull(),
  ruleType: varchar("rule_type", { length: 50 }).notNull(),
  thresholds: jsonb("thresholds").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiWeeklySummaries = pgTable("ai_weekly_summaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
  summary: text("summary").notNull(),
  highlights: jsonb("highlights"),    // string[]
  concerns: jsonb("concerns"),        // string[]
  nextWeekFocus: jsonb("next_week_focus"), // string[]
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiMonthlySummaries = pgTable("ai_monthly_summaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  monthStart: timestamp("month_start", { withTimezone: true }).notNull(),
  summary: text("summary").notNull(),
  highlights: jsonb("highlights"),
  concerns: jsonb("concerns"),
  nextMonthFocus: jsonb("next_month_focus"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiSuggestionLog = pgTable("ai_suggestion_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  suggestionType: varchar("suggestion_type", { length: 50 }).notNull(),
  suggestion: text("suggestion").notNull(),
  accepted: boolean("accepted"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiCoachingPreferences = pgTable("ai_coaching_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" })
    .unique(),
  communicationStyle: varchar("communication_style", { length: 20 }).notNull().default("concise"),
  language: varchar("language", { length: 10 }).notNull().default("da"),
  focusAreas: jsonb("focus_areas").notNull(),
  autoSuggestions: boolean("auto_suggestions").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatConversations = pgTable("chat_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  contextType: varchar("context_type", { length: 50 }),
  contextPage: varchar("context_page", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => chatConversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  contextType: varchar("context_type", { length: 50 }),
  contextPage: varchar("context_page", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const coachNotes = pgTable("coach_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachId: uuid("coach_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  sessionId: bigint("session_id", { mode: "bigint" }).references(() => sessions.id, {
    onDelete: "set null",
  }),
  content: text("content").notNull(),
  visibility: varchar("visibility", { length: 20 }).notNull().default("private"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Recommendations (S5) ───────────────────────────────────────────

export const recommendations = pgTable("recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 50 }).notNull(),
  priority: varchar("priority", { length: 10 }).notNull().default("medium"),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  reasoning: text("reasoning"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  generatedBy: varchar("generated_by", { length: 50 }).notNull().default("ai"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  implementedAt: timestamp("implemented_at", { withTimezone: true }),
  rejectionReason: varchar("rejection_reason", { length: 500 }),
  implementationNotes: varchar("implementation_notes", { length: 1000 }),
  sport: varchar("sport", { length: 10 }),
  scheduledDate: date("scheduled_date"),
  trainingType: varchar("training_type", { length: 50 }),
  durationMinutes: integer("duration_minutes"),
  tss: integer("tss"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Training Constraints (S21) ─────────────────────────────────────

export const athleteTrainingConstraints = pgTable("athlete_training_constraints", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  constraintType: varchar("constraint_type", { length: 30 }).notNull(),
  constraintData: jsonb("constraint_data").notNull(),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Race Results (S24a) ────────────────────────────────────────────

export const raceResults = pgTable("race_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  goalId: uuid("goal_id"),
  raceName: varchar("race_name", { length: 255 }).notNull(),
  raceDate: date("race_date").notNull(),
  raceType: varchar("race_type", { length: 30 }),
  actualSwimTime: integer("actual_swim_time"),
  actualBikeTime: integer("actual_bike_time"),
  actualRunTime: integer("actual_run_time"),
  actualTotalTime: integer("actual_total_time"),
  conditions: text("conditions"),
  notes: text("notes"),
  overallPlacement: integer("overall_placement"),
  ageGroupPlacement: integer("age_group_placement"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
