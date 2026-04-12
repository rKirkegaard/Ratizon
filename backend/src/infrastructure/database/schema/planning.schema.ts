import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  real,
  jsonb,
} from "drizzle-orm/pg-core";
import { athletes } from "./athlete.schema";

export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  goalType: varchar("goal_type", { length: 30 }).notNull(),
  sport: varchar("sport", { length: 10 }),
  targetDate: timestamp("target_date", { withTimezone: true }),
  raceSubType: varchar("race_sub_type", { length: 20 }),
  raceDistance: integer("race_distance"),
  raceTargetTime: integer("race_target_time"),
  swimTargetTime: integer("swim_target_time"),
  bikeTargetTime: integer("bike_target_time"),
  runTargetTime: integer("run_target_time"),
  t1TargetTime: integer("t1_target_time"),
  t2TargetTime: integer("t2_target_time"),
  racePriority: varchar("race_priority", { length: 1 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const athleteTrainingPhases = pgTable("athlete_training_phases", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  phaseNumber: integer("phase_number").notNull(),
  phaseName: varchar("phase_name", { length: 100 }).notNull(),
  phaseType: varchar("phase_type", { length: 20 }).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  ctlTarget: real("ctl_target"),
  weeklyHoursTarget: real("weekly_hours_target"),
  disciplineSplit: jsonb("discipline_split"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weeklyBudgets = pgTable("weekly_budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  phaseId: uuid("phase_id").references(() => athleteTrainingPhases.id, {
    onDelete: "set null",
  }),
  weekStartDate: timestamp("week_start_date", { withTimezone: true }).notNull(),
  totalHours: real("total_hours").notNull(),
  swimHours: real("swim_hours").notNull().default(0),
  bikeHours: real("bike_hours").notNull().default(0),
  runHours: real("run_hours").notNull().default(0),
  strengthHours: real("strength_hours").notNull().default(0),
  targetTss: real("target_tss"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
