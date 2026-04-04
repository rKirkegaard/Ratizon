import {
  pgTable,
  uuid,
  bigserial,
  text,
  varchar,
  timestamp,
  integer,
  real,
  boolean,
  jsonb,
  bigint,
} from "drizzle-orm/pg-core";
import { athletes } from "./athlete.schema";

export const plannedSessions = pgTable("planned_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  sport: varchar("sport", { length: 10 }).notNull(),
  scheduledDate: timestamp("scheduled_date", { withTimezone: true }).notNull(),
  sessionPurpose: varchar("session_purpose", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  targetDurationSeconds: integer("target_duration_seconds"),
  targetDistanceMeters: integer("target_distance_meters"),
  targetTss: real("target_tss"),
  targetZones: jsonb("target_zones"),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  completedSessionId: bigint("completed_session_id", { mode: "bigint" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  plannedSessionId: uuid("planned_session_id").references(() => plannedSessions.id, {
    onDelete: "set null",
  }),
  sport: varchar("sport", { length: 10 }).notNull(),
  sessionType: varchar("session_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  distanceMeters: integer("distance_meters"),
  tss: real("tss"),
  avgHr: integer("avg_hr"),
  maxHr: integer("max_hr"),
  avgPower: integer("avg_power"),
  normalizedPower: integer("normalized_power"),
  avgPace: real("avg_pace"),
  avgCadence: integer("avg_cadence"),
  elevationGain: integer("elevation_gain"),
  calories: integer("calories"),
  sessionQuality: real("session_quality"),
  compliancePct: real("compliance_pct"),
  rpe: integer("rpe"),
  notes: text("notes"),
  source: varchar("source", { length: 50 }),
  externalId: varchar("external_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionTrackpoints = pgTable("session_trackpoints", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  sessionId: bigint("session_id", { mode: "bigint" })
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  lat: real("lat"),
  lng: real("lng"),
  altitude: real("altitude"),
  hr: integer("hr"),
  power: integer("power"),
  cadence: integer("cadence"),
  speed: real("speed"),
  distance: real("distance"),
  temperature: real("temperature"),
});

export const sessionLaps = pgTable("session_laps", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  sessionId: bigint("session_id", { mode: "bigint" })
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  lapNumber: integer("lap_number").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  distanceMeters: integer("distance_meters"),
  avgHr: integer("avg_hr"),
  maxHr: integer("max_hr"),
  avgPower: integer("avg_power"),
  avgPace: real("avg_pace"),
  avgCadence: integer("avg_cadence"),
});
