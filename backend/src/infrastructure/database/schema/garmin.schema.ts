import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { athletes } from "./athlete.schema";

export const garminConnections = pgTable("garmin_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" })
    .unique(),
  garminUserId: varchar("garmin_user_id", { length: 100 }),
  oauthToken: text("oauth_token").notNull(),
  oauthTokenSecret: text("oauth_token_secret").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const garminSyncLog = pgTable("garmin_sync_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => garminConnections.id, { onDelete: "cascade" }),
  syncType: varchar("sync_type", { length: 20 }).notNull(), // 'push' | 'pull' | 'manual'
  activitiesReceived: integer("activities_received").notNull().default(0),
  activitiesImported: integer("activities_imported").notNull().default(0),
  errors: text("errors"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});
