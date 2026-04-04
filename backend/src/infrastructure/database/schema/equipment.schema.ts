import {
  pgTable,
  uuid,
  bigint,
  text,
  varchar,
  timestamp,
  integer,
  real,
  boolean,
} from "drizzle-orm/pg-core";
import { athletes } from "./athlete.schema";
import { sessions } from "./training.schema";

export const equipment = pgTable("equipment", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  equipmentType: varchar("equipment_type", { length: 30 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  purchaseDate: timestamp("purchase_date", { withTimezone: true }),
  maxDistanceKm: real("max_distance_km"),
  maxDurationHours: real("max_duration_hours"),
  currentDistanceKm: real("current_distance_km").notNull().default(0),
  currentDurationHours: real("current_duration_hours").notNull().default(0),
  sessionCount: integer("session_count").notNull().default(0),
  retired: boolean("retired").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionEquipment = pgTable("session_equipment", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: bigint("session_id", { mode: "bigint" })
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  equipmentId: uuid("equipment_id")
    .notNull()
    .references(() => equipment.id, { onDelete: "cascade" }),
  distanceKm: real("distance_km"),
  durationHours: real("duration_hours"),
});

export const equipmentNotificationPrefs = pgTable("equipment_notification_prefs", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  equipmentId: uuid("equipment_id")
    .notNull()
    .references(() => equipment.id, { onDelete: "cascade" }),
  distanceThresholdKm: real("distance_threshold_km"),
  durationThresholdHours: real("duration_threshold_hours"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
