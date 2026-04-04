import {
  pgTable,
  uuid,
  bigserial,
  bigint,
  text,
  varchar,
  timestamp,
  integer,
  real,
} from "drizzle-orm/pg-core";
import { sessions } from "./training.schema";
import { athletes } from "./athlete.schema";

export const sessionAnalytics = pgTable("session_analytics", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  sessionId: bigint("session_id", { mode: "bigint" })
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" })
    .unique(),
  efficiencyFactor: real("efficiency_factor"),
  decoupling: real("decoupling"),
  intensityFactor: real("intensity_factor"),
  variabilityIndex: real("variability_index"),
  zone1Seconds: integer("zone_1_seconds").notNull().default(0),
  zone2Seconds: integer("zone_2_seconds").notNull().default(0),
  zone3Seconds: integer("zone_3_seconds").notNull().default(0),
  zone4Seconds: integer("zone_4_seconds").notNull().default(0),
  zone5Seconds: integer("zone_5_seconds").notNull().default(0),
  trimp: real("trimp"),
  hrss: real("hrss"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionPowerCurve = pgTable("session_power_curve", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  sessionId: bigint("session_id", { mode: "bigint" })
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  durationSeconds: integer("duration_seconds").notNull(),
  maxPower: integer("max_power").notNull(),
});

export const athletePmc = pgTable("athlete_pmc", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  sport: varchar("sport", { length: 10 }).notNull(),
  ctl: real("ctl").notNull().default(0),
  atl: real("atl").notNull().default(0),
  tsb: real("tsb").notNull().default(0),
  monotony: real("monotony"),
  strain: real("strain"),
  rampRate: real("ramp_rate"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const athletePowerRecords = pgTable("athlete_power_records", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  sport: varchar("sport", { length: 10 }).notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  maxPower: integer("max_power").notNull(),
  sessionId: bigint("session_id", { mode: "bigint" }).references(() => sessions.id, {
    onDelete: "set null",
  }),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionQualityAssessments = pgTable("session_quality_assessments", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  sessionId: bigint("session_id", { mode: "bigint" })
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" })
    .unique(),
  overallScore: real("overall_score").notNull(),
  paceConsistency: real("pace_consistency"),
  hrDrift: real("hr_drift"),
  zoneAdherence: real("zone_adherence"),
  notes: text("notes"),
  assessedAt: timestamp("assessed_at", { withTimezone: true }).notNull().defaultNow(),
});
