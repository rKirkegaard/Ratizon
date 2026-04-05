import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  real,
  jsonb,
} from "drizzle-orm/pg-core";
import { athletes } from "./athlete.schema";
import { goals } from "./planning.schema";

export const racePlans = pgTable("race_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  raceType: varchar("race_type", { length: 20 }).notNull().default("full"), // sprint, olympic, half, full, custom
  customSwimDistance: integer("custom_swim_distance"),  // meters (for custom races)
  customBikeDistance: integer("custom_bike_distance"),  // meters
  customRunDistance: integer("custom_run_distance"),    // meters
  swimPace: real("swim_pace"),          // seconds per 100m
  t1Target: integer("t1_target"),       // seconds
  bikePower: integer("bike_power"),     // watts target
  bikePace: real("bike_pace"),          // seconds per km
  t2Target: integer("t2_target"),       // seconds
  runPace: real("run_pace"),            // seconds per km
  targetSwimTime: integer("target_swim_time"),  // seconds
  targetBikeTime: integer("target_bike_time"),  // seconds
  targetRunTime: integer("target_run_time"),    // seconds
  targetTotalTime: integer("target_total_time"),// seconds
  nutritionStrategy: jsonb("nutrition_strategy"), // { caloriesPerHourBike, caloriesPerHourRun, notes }
  hydrationStrategy: jsonb("hydration_strategy"), // { fluidPerHourMl, sodiumPerHourMg, notes }
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const raceNutritionItems = pgTable("race_nutrition_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  racePlanId: uuid("race_plan_id")
    .notNull()
    .references(() => racePlans.id, { onDelete: "cascade" }),
  segmentType: varchar("segment_type", { length: 10 }).notNull(), // swim, t1, bike, t2, run
  timeOffsetMin: integer("time_offset_min").notNull(), // minutes from segment start
  item: varchar("item", { length: 255 }).notNull(),
  calories: integer("calories"),
  sodiumMg: integer("sodium_mg"),
  fluidMl: integer("fluid_ml"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
