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
