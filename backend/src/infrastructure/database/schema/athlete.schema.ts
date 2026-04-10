import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  real,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: varchar("role", { length: 20 }).notNull().default("athlete"),
  isActive: boolean("is_active").notNull().default(true),
  avatarUrl: text("avatar_url"),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const athletes = pgTable("athletes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
  gender: varchar("gender", { length: 10 }),
  weight: real("weight"),
  restingHr: integer("resting_hr"),
  maxHr: integer("max_hr"),
  ftp: integer("ftp"),
  lthr: integer("lthr"),
  swimCss: integer("swim_css"),
  runThresholdPace: varchar("run_threshold_pace", { length: 10 }),  // M:SS format, e.g. "4:15"
  height: real("height"),                              // cm
  trainingPhilosophy: varchar("training_philosophy", { length: 50 }), // polarized, pyramidal, sweet_spot, norwegian, etc.
  weeklyVolumeMin: real("weekly_volume_min"),           // hours per week
  weeklyVolumeMax: real("weekly_volume_max"),           // hours per week
  cycleType: varchar("cycle_type", { length: 10 }),     // 3:1, 2:1, 4:1
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const athleteProfiles = pgTable("athlete_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  sport: varchar("sport", { length: 10 }).notNull(),
  hrZones: jsonb("hr_zones"),
  paceZones: jsonb("pace_zones"),
  powerZones: jsonb("power_zones"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const coachAthleteAssignments = pgTable("coach_athlete_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachId: uuid("coach_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  athleteId: uuid("athlete_id")
    .notNull()
    .references(() => athletes.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
});

export const athletePagePermissions = pgTable("athlete_page_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteId: uuid("athlete_id")
    .references(() => athletes.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  pageKey: varchar("page_key", { length: 50 }).notNull(),
  hasAccess: boolean("has_access").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
