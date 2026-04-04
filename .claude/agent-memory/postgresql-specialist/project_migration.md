---
name: IronCoach to Ratizon migration
description: Active data migration from IronCoach (SQL Server) to Ratizon (PostgreSQL) — connection details, table status, and script locations
type: project
---

Migration: IronCoach (SQL Server) → Ratizon (PostgreSQL)

Source: Server=DESKTOP-JTPP64U, Database=IronCoach, User=lovabledev, Password=lovabledev
Target: postgresql://ratizon:Ratizon@localhost:5432/ratizon

Migration scripts (both in C:/Privat/Development/Ratizon/scripts/):
- migrate-from-ironcoach.ts — original full migration (users, athletes, sessions, trackpoints)
- migrate-remaining.ts — partial migration for tables that were 0/incomplete as of 2026-04-02

Table status as of 2026-04-04 run:
- users: 6 rows OK
- athletes: 2 rows OK
- sessions: 118 rows OK
- session_trackpoints: 351,668 rows OK
- sport_configs: 8 rows OK
- session_analytics: 110/117 OK (7 fail FK — sessions not in target, expected)
- session_laps: pending (1,534 source rows)
- athlete_pmc: pending (88 source rows)
- goals: pending (4 source rows)
- equipment: pending (3 source rows)
- athlete_power_records: pending (11 source rows)
- chat_conversations: pending (7 source rows)
- chat_messages: pending (86 source rows)

Key column mappings discovered:
- session_analytics.decoupling_pct → target column is "decoupling" (not decoupling_pct)
- session_analytics.zone*_pct → zone_*_seconds (pct × duration_s / 100)
- athlete_pmc: source has daily_tss column, target does NOT
- goals: source id not carried over (target uses SERIAL); guard on (athlete_id, title, target_date)
- equipment: source id not carried over; guard on (athlete_id, name)
- athlete_power_records: session_id is NVARCHAR in source, BIGINT in target (cast, NULL if non-numeric)
- chat_messages: conversation_id must be remapped via source→target ID map

**Why:** Full replatforming from IronCoach product to Ratizon.
**How to apply:** When generating SQL or migration code, use these exact column names and mappings. Do not assume source and target column names match.
