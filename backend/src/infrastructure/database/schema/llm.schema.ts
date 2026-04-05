import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  real,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { athletes } from "./athlete.schema";

// System-wide LLM settings (singleton — one row)
export const llmSettings = pgTable("llm_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  defaultProvider: varchar("default_provider", { length: 20 }).notNull().default("openai"), // openai, anthropic
  defaultModel: varchar("default_model", { length: 50 }).notNull().default("gpt-4o-mini"),
  openaiKeyEncrypted: text("openai_key_encrypted"),
  openaiKeyIv: varchar("openai_key_iv", { length: 32 }),
  anthropicKeyEncrypted: text("anthropic_key_encrypted"),
  anthropicKeyIv: varchar("anthropic_key_iv", { length: 32 }),
  globalMonthlyBudgetCents: integer("global_monthly_budget_cents"), // null = unlimited
  defaultSystemContext: text("default_system_context"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Per-athlete LLM preferences
export const athleteLlmPreferences = pgTable("athlete_llm_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" })
    .unique(),
  inheritFromSystem: boolean("inherit_from_system").notNull().default(true),
  preferredProvider: varchar("preferred_provider", { length: 20 }),
  preferredModel: varchar("preferred_model", { length: 50 }),
  monthlyBudgetCents: integer("monthly_budget_cents"), // null = use system or unlimited
  customSystemContext: text("custom_system_context"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Token/cost usage tracking
export const llmUsage = pgTable("llm_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 20 }).notNull(),
  model: varchar("model", { length: 50 }).notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  costCents: real("cost_cents").notNull().default(0), // cost in USD cents
  requestType: varchar("request_type", { length: 30 }).notNull(), // chat, briefing, feedback, plan
  metadata: jsonb("metadata"), // extra context
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
