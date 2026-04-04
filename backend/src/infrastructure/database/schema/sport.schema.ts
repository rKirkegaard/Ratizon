import {
  pgTable,
  uuid,
  bigserial,
  text,
  smallint,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { athletes } from "./athlete.schema";

export const sportConfigs = pgTable(
  "sport_configs",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    sportKey: text("sport_key").notNull(),
    displayName: text("display_name").notNull(),
    color: text("color").notNull(),
    icon: text("icon").notNull(),
    sortOrder: smallint("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    hasDistance: boolean("has_distance").notNull().default(true),
    hasPower: boolean("has_power").notNull().default(false),
    hasPace: boolean("has_pace").notNull().default(false),
    hasZones: boolean("has_zones").notNull().default(true),
    zoneModel: text("zone_model"),
    dedicatedPage: boolean("dedicated_page").notNull().default(false),
    distanceUnit: text("distance_unit").default("km"),
    paceUnit: text("pace_unit"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    athleteSportUnique: unique("sport_configs_athlete_sport_key").on(
      table.athleteId,
      table.sportKey
    ),
  })
);
