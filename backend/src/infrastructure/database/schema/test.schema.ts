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

export const performanceTests = pgTable("performance_tests", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  testType: varchar("test_type", { length: 20 }).notNull(), // lactate, ftp, css, run_threshold, vo2max
  testDate: timestamp("test_date", { withTimezone: true }).notNull(),
  protocol: varchar("protocol", { length: 100 }),       // e.g. "20min FTP", "7x200m CSS", "Step test"
  sport: varchar("sport", { length: 10 }).notNull(),     // swim, bike, run
  // Results
  resultValue: real("result_value"),                     // primary result (FTP watts, CSS s/100m, pace s/km)
  resultUnit: varchar("result_unit", { length: 20 }),    // W, s/100m, s/km, ml/kg/min
  heartRateAvg: integer("heart_rate_avg"),
  heartRateMax: integer("heart_rate_max"),
  lactateData: jsonb("lactate_data"),                    // array of { step, watts/pace, lactate, hr }
  // Baseline update
  baselineField: varchar("baseline_field", { length: 30 }),  // ftp, swimCss, runThresholdPace, lthr, maxHr
  baselineValue: real("baseline_value"),                     // value applied to athlete profile
  baselineApplied: timestamp("baseline_applied", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
