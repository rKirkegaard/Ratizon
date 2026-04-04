import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  real,
  smallint,
} from "drizzle-orm/pg-core";
import { athletes } from "./athlete.schema";

export const wellnessDaily = pgTable("wellness_daily", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  sleepHours: real("sleep_hours"),
  sleepQuality: smallint("sleep_quality"),
  restingHr: integer("resting_hr"),
  hrvMssd: real("hrv_mssd"),
  bodyWeight: real("body_weight"),
  bodyBattery: smallint("body_battery"),
  stressLevel: smallint("stress_level"),
  fatigue: smallint("fatigue"),
  soreness: smallint("soreness"),
  mood: smallint("mood"),
  motivation: smallint("motivation"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const injuries = pgTable("injuries", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  bodyPart: varchar("body_part", { length: 100 }).notNull(),
  description: text("description").notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const athleteStreaks = pgTable("athlete_streaks", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  streakType: varchar("streak_type", { length: 50 }).notNull(),
  currentCount: integer("current_count").notNull().default(0),
  longestCount: integer("longest_count").notNull().default(0),
  lastActivityDate: timestamp("last_activity_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
