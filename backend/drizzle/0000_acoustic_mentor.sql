CREATE TABLE "ai_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"rule_id" uuid,
	"alert_type" varchar(30) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"acknowledged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_coaching_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"communication_style" varchar(20) DEFAULT 'concise' NOT NULL,
	"language" varchar(10) DEFAULT 'da' NOT NULL,
	"focus_areas" jsonb NOT NULL,
	"auto_suggestions" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_coaching_preferences_athlete_id_unique" UNIQUE("athlete_id")
);
--> statement-breakpoint
CREATE TABLE "ai_daily_briefings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"summary" text NOT NULL,
	"recommendations" jsonb NOT NULL,
	"warnings" jsonb NOT NULL,
	"focus_areas" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_session_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" bigint NOT NULL,
	"overall_assessment" text NOT NULL,
	"strengths" jsonb NOT NULL,
	"improvements" jsonb NOT NULL,
	"next_session_suggestion" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_suggestion_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"suggestion_type" varchar(50) NOT NULL,
	"suggestion" text NOT NULL,
	"accepted" boolean,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"rule_name" varchar(100) NOT NULL,
	"rule_type" varchar(50) NOT NULL,
	"thresholds" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"context_type" varchar(50),
	"context_page" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"context_type" varchar(50),
	"context_page" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"session_id" bigint,
	"content" text NOT NULL,
	"visibility" varchar(20) DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_pmc" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"athlete_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"sport" varchar(10) NOT NULL,
	"ctl" real DEFAULT 0 NOT NULL,
	"atl" real DEFAULT 0 NOT NULL,
	"tsb" real DEFAULT 0 NOT NULL,
	"monotony" real,
	"strain" real,
	"ramp_rate" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_power_records" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"athlete_id" uuid NOT NULL,
	"sport" varchar(10) NOT NULL,
	"duration_seconds" integer NOT NULL,
	"max_power" integer NOT NULL,
	"session_id" bigint,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_analytics" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" bigint NOT NULL,
	"efficiency_factor" real,
	"decoupling" real,
	"intensity_factor" real,
	"variability_index" real,
	"zone_1_seconds" integer DEFAULT 0 NOT NULL,
	"zone_2_seconds" integer DEFAULT 0 NOT NULL,
	"zone_3_seconds" integer DEFAULT 0 NOT NULL,
	"zone_4_seconds" integer DEFAULT 0 NOT NULL,
	"zone_5_seconds" integer DEFAULT 0 NOT NULL,
	"trimp" real,
	"hrss" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_analytics_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "session_power_curve" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" bigint NOT NULL,
	"duration_seconds" integer NOT NULL,
	"max_power" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_quality_assessments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" bigint NOT NULL,
	"overall_score" real NOT NULL,
	"pace_consistency" real,
	"hr_drift" real,
	"zone_adherence" real,
	"notes" text,
	"assessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_quality_assessments_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "athlete_page_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid,
	"user_id" uuid,
	"page_key" varchar(50) NOT NULL,
	"has_access" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"sport" varchar(10) NOT NULL,
	"hr_zones" jsonb,
	"pace_zones" jsonb,
	"power_zones" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athletes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date_of_birth" timestamp with time zone,
	"gender" varchar(10),
	"weight" real,
	"resting_hr" integer,
	"max_hr" integer,
	"ftp" integer,
	"lthr" integer,
	"swim_css" integer,
	"run_threshold_pace" varchar(10),
	"height" real,
	"training_philosophy" varchar(50),
	"weekly_volume_min" real,
	"weekly_volume_max" real,
	"cycle_type" varchar(10),
	"profile_image_url" text,
	"pool_urls" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "athletes_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "coach_athlete_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"role" varchar(20) DEFAULT 'athlete' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"avatar_url" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(50) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"details" text,
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "brick_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brick_id" uuid NOT NULL,
	"session_id" bigint NOT NULL,
	"segment_order" integer NOT NULL,
	"sport" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_bricks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"brick_type" varchar(20) NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"total_duration_seconds" integer DEFAULT 0 NOT NULL,
	"total_distance_meters" integer,
	"total_tss" real,
	"t1_seconds" integer,
	"t2_seconds" integer,
	"notes" text,
	"auto_detected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"equipment_type" varchar(30) NOT NULL,
	"brand" varchar(100),
	"model" varchar(100),
	"purchase_date" timestamp with time zone,
	"max_distance_km" real,
	"max_duration_hours" real,
	"current_distance_km" real DEFAULT 0 NOT NULL,
	"current_duration_hours" real DEFAULT 0 NOT NULL,
	"session_count" integer DEFAULT 0 NOT NULL,
	"retired" boolean DEFAULT false NOT NULL,
	"is_default_for" varchar(10),
	"initial_km" real DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"threshold_pct" integer NOT NULL,
	"notified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_notification_prefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"equipment_id" uuid NOT NULL,
	"distance_threshold_km" real,
	"duration_threshold_hours" real,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" bigint NOT NULL,
	"equipment_id" uuid NOT NULL,
	"distance_km" real,
	"duration_hours" real,
	"segment_type" varchar(20) DEFAULT 'full',
	"lap_indices" text,
	"segment_min" real,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "garmin_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"garmin_user_id" varchar(100),
	"oauth_token" text NOT NULL,
	"oauth_token_secret" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp with time zone,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "garmin_connections_athlete_id_unique" UNIQUE("athlete_id")
);
--> statement-breakpoint
CREATE TABLE "garmin_sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"sync_type" varchar(20) NOT NULL,
	"activities_received" integer DEFAULT 0 NOT NULL,
	"activities_imported" integer DEFAULT 0 NOT NULL,
	"errors" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_llm_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"inherit_from_system" boolean DEFAULT true NOT NULL,
	"preferred_provider" varchar(20),
	"preferred_model" varchar(50),
	"monthly_budget_cents" integer,
	"custom_system_context" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "athlete_llm_preferences_athlete_id_unique" UNIQUE("athlete_id")
);
--> statement-breakpoint
CREATE TABLE "llm_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"default_provider" varchar(20) DEFAULT 'openai' NOT NULL,
	"default_model" varchar(50) DEFAULT 'gpt-4o-mini' NOT NULL,
	"openai_key_encrypted" text,
	"openai_key_iv" varchar(32),
	"anthropic_key_encrypted" text,
	"anthropic_key_iv" varchar(32),
	"global_monthly_budget_cents" integer,
	"default_system_context" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"model" varchar(50) NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"cost_cents" real DEFAULT 0 NOT NULL,
	"request_type" varchar(30) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_training_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"goal_id" uuid,
	"phase_number" integer NOT NULL,
	"phase_name" varchar(100) NOT NULL,
	"phase_type" varchar(20) NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"ctl_target" real,
	"weekly_hours_target" real,
	"discipline_split" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"goal_type" varchar(30) NOT NULL,
	"sport" varchar(10),
	"target_date" timestamp with time zone,
	"race_distance" integer,
	"race_target_time" integer,
	"swim_target_time" integer,
	"bike_target_time" integer,
	"run_target_time" integer,
	"t1_target_time" integer,
	"t2_target_time" integer,
	"race_priority" varchar(1),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"phase_id" uuid,
	"week_start_date" timestamp with time zone NOT NULL,
	"total_hours" real NOT NULL,
	"swim_hours" real DEFAULT 0 NOT NULL,
	"bike_hours" real DEFAULT 0 NOT NULL,
	"run_hours" real DEFAULT 0 NOT NULL,
	"strength_hours" real DEFAULT 0 NOT NULL,
	"target_tss" real,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "race_nutrition_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"race_plan_id" uuid NOT NULL,
	"segment_type" varchar(10) NOT NULL,
	"time_offset_min" integer NOT NULL,
	"item" varchar(255) NOT NULL,
	"calories" integer,
	"sodium_mg" integer,
	"fluid_ml" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "race_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"goal_id" uuid,
	"race_type" varchar(20) DEFAULT 'full' NOT NULL,
	"custom_swim_distance" integer,
	"custom_bike_distance" integer,
	"custom_run_distance" integer,
	"swim_pace" real,
	"t1_target" integer,
	"bike_power" integer,
	"bike_pace" real,
	"t2_target" integer,
	"run_pace" real,
	"target_swim_time" integer,
	"target_bike_time" integer,
	"target_run_time" integer,
	"target_total_time" integer,
	"scenarios" jsonb,
	"nutrition_strategy" jsonb,
	"hydration_strategy" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sport_configs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"athlete_id" uuid NOT NULL,
	"sport_key" text NOT NULL,
	"display_name" text NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"has_distance" boolean DEFAULT true NOT NULL,
	"has_power" boolean DEFAULT false NOT NULL,
	"has_pace" boolean DEFAULT false NOT NULL,
	"has_zones" boolean DEFAULT true NOT NULL,
	"zone_model" text,
	"dedicated_page" boolean DEFAULT false NOT NULL,
	"distance_unit" text DEFAULT 'km',
	"pace_unit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sport_configs_athlete_sport_key" UNIQUE("athlete_id","sport_key")
);
--> statement-breakpoint
CREATE TABLE "performance_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"test_type" varchar(20) NOT NULL,
	"test_date" timestamp with time zone NOT NULL,
	"protocol" varchar(100),
	"sport" varchar(10) NOT NULL,
	"result_value" real,
	"result_unit" varchar(20),
	"heart_rate_avg" integer,
	"heart_rate_max" integer,
	"lactate_data" jsonb,
	"baseline_field" varchar(30),
	"baseline_value" real,
	"baseline_applied" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planned_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"sport" varchar(10) NOT NULL,
	"scheduled_date" timestamp with time zone NOT NULL,
	"session_purpose" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"target_duration_seconds" integer,
	"target_distance_meters" integer,
	"target_tss" real,
	"target_zones" jsonb,
	"session_blocks" jsonb,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"completed_session_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_laps" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" bigint NOT NULL,
	"lap_number" integer NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"duration_seconds" integer NOT NULL,
	"distance_meters" integer,
	"avg_hr" integer,
	"max_hr" integer,
	"avg_power" integer,
	"avg_pace" real,
	"avg_cadence" integer
);
--> statement-breakpoint
CREATE TABLE "session_trackpoints" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" bigint NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"lat" real,
	"lng" real,
	"altitude" real,
	"hr" integer,
	"power" integer,
	"cadence" integer,
	"speed" real,
	"distance" real,
	"temperature" real
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"athlete_id" uuid NOT NULL,
	"planned_session_id" uuid,
	"sport" varchar(10) NOT NULL,
	"session_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"duration_seconds" integer NOT NULL,
	"distance_meters" integer,
	"tss" real,
	"avg_hr" integer,
	"max_hr" integer,
	"avg_power" integer,
	"normalized_power" integer,
	"avg_pace" real,
	"avg_cadence" integer,
	"elevation_gain" integer,
	"calories" integer,
	"session_quality" real,
	"compliance_pct" real,
	"rpe" integer,
	"notes" text,
	"source" varchar(50),
	"external_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_streaks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"streak_type" varchar(50) NOT NULL,
	"current_count" integer DEFAULT 0 NOT NULL,
	"longest_count" integer DEFAULT 0 NOT NULL,
	"last_activity_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "injuries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"body_part" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"severity" varchar(20) NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wellness_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"sleep_hours" real,
	"sleep_quality" smallint,
	"resting_hr" integer,
	"hrv_mssd" real,
	"body_weight" real,
	"body_battery" smallint,
	"stress_level" smallint,
	"fatigue" smallint,
	"soreness" smallint,
	"mood" smallint,
	"motivation" smallint,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_alerts" ADD CONSTRAINT "ai_alerts_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_coaching_preferences" ADD CONSTRAINT "ai_coaching_preferences_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_daily_briefings" ADD CONSTRAINT "ai_daily_briefings_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_session_feedback" ADD CONSTRAINT "ai_session_feedback_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_suggestion_log" ADD CONSTRAINT "ai_suggestion_log_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_pmc" ADD CONSTRAINT "athlete_pmc_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_power_records" ADD CONSTRAINT "athlete_power_records_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_power_records" ADD CONSTRAINT "athlete_power_records_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_analytics" ADD CONSTRAINT "session_analytics_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_power_curve" ADD CONSTRAINT "session_power_curve_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_quality_assessments" ADD CONSTRAINT "session_quality_assessments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_page_permissions" ADD CONSTRAINT "athlete_page_permissions_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_page_permissions" ADD CONSTRAINT "athlete_page_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_profiles" ADD CONSTRAINT "athlete_profiles_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_athlete_assignments" ADD CONSTRAINT "coach_athlete_assignments_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_athlete_assignments" ADD CONSTRAINT "coach_athlete_assignments_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_audit_log" ADD CONSTRAINT "auth_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brick_segments" ADD CONSTRAINT "brick_segments_brick_id_session_bricks_id_fk" FOREIGN KEY ("brick_id") REFERENCES "public"."session_bricks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brick_segments" ADD CONSTRAINT "brick_segments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_bricks" ADD CONSTRAINT "session_bricks_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_notification_log" ADD CONSTRAINT "equipment_notification_log_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_notification_prefs" ADD CONSTRAINT "equipment_notification_prefs_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_notification_prefs" ADD CONSTRAINT "equipment_notification_prefs_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_equipment" ADD CONSTRAINT "session_equipment_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_equipment" ADD CONSTRAINT "session_equipment_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garmin_connections" ADD CONSTRAINT "garmin_connections_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garmin_sync_log" ADD CONSTRAINT "garmin_sync_log_connection_id_garmin_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."garmin_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_llm_preferences" ADD CONSTRAINT "athlete_llm_preferences_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_training_phases" ADD CONSTRAINT "athlete_training_phases_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_training_phases" ADD CONSTRAINT "athlete_training_phases_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_budgets" ADD CONSTRAINT "weekly_budgets_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_budgets" ADD CONSTRAINT "weekly_budgets_phase_id_athlete_training_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."athlete_training_phases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_nutrition_items" ADD CONSTRAINT "race_nutrition_items_race_plan_id_race_plans_id_fk" FOREIGN KEY ("race_plan_id") REFERENCES "public"."race_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_plans" ADD CONSTRAINT "race_plans_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_plans" ADD CONSTRAINT "race_plans_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sport_configs" ADD CONSTRAINT "sport_configs_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_tests" ADD CONSTRAINT "performance_tests_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_sessions" ADD CONSTRAINT "planned_sessions_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_laps" ADD CONSTRAINT "session_laps_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_trackpoints" ADD CONSTRAINT "session_trackpoints_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_planned_session_id_planned_sessions_id_fk" FOREIGN KEY ("planned_session_id") REFERENCES "public"."planned_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_streaks" ADD CONSTRAINT "athlete_streaks_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "injuries" ADD CONSTRAINT "injuries_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wellness_daily" ADD CONSTRAINT "wellness_daily_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;