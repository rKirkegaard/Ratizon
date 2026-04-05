import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  real,
  boolean,
  bigint,
} from "drizzle-orm/pg-core";
import { athletes } from "./athlete.schema";
import { sessions } from "./training.schema";

export const sessionBricks = pgTable("session_bricks", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  brickType: varchar("brick_type", { length: 20 }).notNull(), // 'bike-run', 'swim-bike', 'swim-bike-run', 'custom'
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  totalDurationSeconds: integer("total_duration_seconds").notNull().default(0),
  totalDistanceMeters: integer("total_distance_meters"),
  totalTss: real("total_tss"),
  t1Seconds: integer("t1_seconds"), // transition 1 time (e.g. swim→bike)
  t2Seconds: integer("t2_seconds"), // transition 2 time (e.g. bike→run)
  notes: text("notes"),
  autoDetected: boolean("auto_detected").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const brickSegments = pgTable("brick_segments", {
  id: uuid("id").defaultRandom().primaryKey(),
  brickId: uuid("brick_id")
    .notNull()
    .references(() => sessionBricks.id, { onDelete: "cascade" }),
  sessionId: bigint("session_id", { mode: "bigint" })
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  segmentOrder: integer("segment_order").notNull(),
  sport: varchar("sport", { length: 10 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
