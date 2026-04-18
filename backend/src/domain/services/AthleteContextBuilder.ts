/**
 * Athlete Context Builder (S4)
 * Builds structured training data context for LLM system prompts.
 * Used by chat, briefing, feedback, and plan generation.
 */

import { db } from "../../infrastructure/database/connection.js";
import { athletes } from "../../infrastructure/database/schema/athlete.schema.js";
import { users } from "../../infrastructure/database/schema/athlete.schema.js";
import { sessions } from "../../infrastructure/database/schema/training.schema.js";
import { wellnessDaily } from "../../infrastructure/database/schema/wellness.schema.js";
import { athletePmc } from "../../infrastructure/database/schema/analytics.schema.js";
import { goals } from "../../infrastructure/database/schema/planning.schema.js";
import { aiCoachingPreferences } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { sessionLaps } from "../../infrastructure/database/schema/training.schema.js";
import { eq, and, desc, gte, asc, sql } from "drizzle-orm";

export interface ContextOptions {
  sport?: string;       // "all", "swim", "bike", "run"
  weeks?: number;       // data range in weeks (default 2)
  customContext?: string; // free-text context from user
  includeWellness?: boolean;
  includePMC?: boolean;
  includeGoals?: boolean;
  includeSessions?: boolean;
  selectedSessionIds?: number[]; // specific sessions with full detail (laps)
}

export async function buildAthleteContext(athleteId: string, options: ContextOptions = {}): Promise<string> {
  const {
    sport = "all",
    weeks = 2,
    customContext,
    includeWellness = true,
    includePMC = true,
    includeGoals = true,
    includeSessions = true,
    selectedSessionIds,
  } = options;

  const parts: string[] = [];
  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - weeks * 7);

  // 1. Athlete profile
  const [athlete] = await db
    .select({
      maxHr: athletes.maxHr,
      restingHr: athletes.restingHr,
      ftp: athletes.ftp,
      lthr: athletes.lthr,
      swimCss: athletes.swimCss,
      runThresholdPace: athletes.runThresholdPace,
      weight: athletes.weight,
      height: athletes.height,
      trainingPhilosophy: athletes.trainingPhilosophy,
      weeklyVolumeMin: athletes.weeklyVolumeMin,
      weeklyVolumeMax: athletes.weeklyVolumeMax,
      cycleType: athletes.cycleType,
    })
    .from(athletes)
    .where(eq(athletes.id, athleteId))
    .limit(1);

  // Get display name from users
  const [user] = await db
    .select({ name: users.displayName })
    .from(users)
    .innerJoin(athletes, eq(athletes.userId, users.id))
    .where(eq(athletes.id, athleteId))
    .limit(1);

  if (athlete) {
    parts.push(`ATLET INFORMATION:
- Navn: ${user?.name ?? "Ukendt"}
- Max Puls: ${athlete.maxHr ?? "ukendt"} bpm
- Hvile Puls: ${athlete.restingHr ?? "ukendt"} bpm
- FTP (Watt): ${athlete.ftp ?? "ukendt"}
- LTHR: ${athlete.lthr ?? "ukendt"} bpm
- Loeb Threshold Pace: ${athlete.runThresholdPace ?? "ukendt"} min/km
- CSS (Svoem): ${athlete.swimCss ? Math.floor(athlete.swimCss / 60) + ":" + String(athlete.swimCss % 60).padStart(2, "0") + " /100m" : "ukendt"}
- Hoejde: ${athlete.height ?? "ukendt"} cm
- Vaegt: ${athlete.weight ?? "ukendt"} kg
- Traeningsfilosofi: ${athlete.trainingPhilosophy ?? "ikke angivet"}
- Ugentlig volumen: ${athlete.weeklyVolumeMin ?? "?"}–${athlete.weeklyVolumeMax ?? "?"} timer/uge
- Mesocyklus: ${athlete.cycleType ?? "ikke angivet"}`);
  }

  // 1b. Current training phase + weeks to goal
  try {
    const { athleteTrainingPhases } = await import("../../infrastructure/database/schema/planning.schema.js");
    const now = new Date();
    const [currentPhase] = await db
      .select({ phaseName: athleteTrainingPhases.phaseName, phaseType: athleteTrainingPhases.phaseType, endDate: athleteTrainingPhases.endDate })
      .from(athleteTrainingPhases)
      .where(and(
        eq(athleteTrainingPhases.athleteId, athleteId),
        gte(athleteTrainingPhases.endDate, now)
      ))
      .orderBy(asc(athleteTrainingPhases.startDate))
      .limit(1);

    if (currentPhase) {
      const weeksLeft = Math.ceil((new Date(currentPhase.endDate).getTime() - now.getTime()) / (7 * 86400000));
      parts.push(`AKTUEL TRAENINGSFASE: ${currentPhase.phaseName} (${currentPhase.phaseType}) — ${weeksLeft} uger tilbage i fasen`);
    }
  } catch { /* phases table may not exist */ }

  // 2. PMC status
  if (includePMC) {
    const [pmc] = await db
      .select({ ctl: athletePmc.ctl, atl: athletePmc.atl, tsb: athletePmc.tsb, rampRate: athletePmc.rampRate, date: athletePmc.date })
      .from(athletePmc)
      .where(and(eq(athletePmc.athleteId, athleteId), eq(athletePmc.sport, "all")))
      .orderBy(desc(athletePmc.date))
      .limit(1);

    if (pmc) {
      const tsbStatus = pmc.tsb > 10 ? "frisk" : pmc.tsb > -10 ? "neutral" : pmc.tsb > -20 ? "traet" : "overtranset";
      parts.push(`PMC STATUS (${pmc.date.toISOString().slice(0, 10)}):
- CTL (fitness): ${pmc.ctl.toFixed(1)}
- ATL (traethed): ${pmc.atl.toFixed(1)}
- TSB (form): ${pmc.tsb.toFixed(1)} — ${tsbStatus}
- Ramp rate: ${pmc.rampRate?.toFixed(1) ?? "ukendt"} CTL/uge`);
    }
  }

  // 3. Wellness
  if (includeWellness) {
    const wellnessRows = await db
      .select()
      .from(wellnessDaily)
      .where(and(eq(wellnessDaily.athleteId, athleteId), gte(wellnessDaily.date, rangeStart)))
      .orderBy(desc(wellnessDaily.date))
      .limit(3);

    if (wellnessRows.length > 0) {
      const w = wellnessRows[0];
      parts.push(`SENESTE WELLNESS (${w.date.toISOString().slice(0, 10)}):
- Soevn: ${w.sleepHours ?? "?"} timer, kvalitet: ${w.sleepQuality ?? "?"}/5
- Hvile-puls: ${w.restingHr ?? "?"} bpm, HRV: ${w.hrvMssd ?? "?"} ms
- Traethed: ${w.fatigue ?? "?"}/5, Oemmelse: ${w.soreness ?? "?"}/5
- Humur: ${w.mood ?? "?"}/5, Motivation: ${w.motivation ?? "?"}/5
- Energi: ${w.energy ?? "?"}/5, Stress: ${w.stress ?? "?"}/5`);
    }
  }

  // 4. Recent sessions — full detail
  if (includeSessions) {
    const conditions = [eq(sessions.athleteId, athleteId), gte(sessions.startedAt, rangeStart)];
    if (sport !== "all") conditions.push(eq(sessions.sport, sport));

    const recentSessions = await db
      .select()
      .from(sessions)
      .where(and(...conditions))
      .orderBy(desc(sessions.startedAt))
      .limit(20);

    if (recentSessions.length > 0) {
      const header = sport !== "all" ? `SENESTE ${sport.toUpperCase()} SESSIONER (${weeks} uger)` : `SENESTE SESSIONER (${weeks} uger)`;
      const sessionBlocks: string[] = [];

      for (const s of recentSessions) {
        const dur = s.durationSeconds ? `${Math.round(s.durationSeconds / 60)}min` : "?";
        const dist = s.distanceMeters ? `${(s.distanceMeters / 1000).toFixed(1)}km` : "";
        const pace = s.avgPace ? `${Math.floor(s.avgPace / 60)}:${String(Math.round(s.avgPace % 60)).padStart(2, "0")} min/km` : "";

        let block = `  ${s.startedAt.toISOString().slice(0, 10)} | ${s.sport} | "${s.title}" | Type: ${s.sessionType}
    Varighed: ${dur} | Distance: ${dist || "N/A"} | TSS: ${s.tss?.toFixed(0) ?? "?"}
    HR: avg ${s.avgHr ?? "?"} / max ${s.maxHr ?? "?"} bpm`;

        if (s.avgPower || s.normalizedPower) {
          block += ` | Power: avg ${s.avgPower ?? "?"}W / NP ${s.normalizedPower ?? "?"}W`;
        }
        if (pace) block += ` | Pace: ${pace}`;
        if (s.avgCadence) block += ` | Kadence: ${s.avgCadence}`;
        if (s.elevationGain) block += ` | Hoejdemeter: ${s.elevationGain}m`;
        if (s.calories) block += ` | Kalorier: ${s.calories}`;
        if (s.rpe) block += `\n    RPE: ${s.rpe}/10`;
        if (s.compliancePct != null) block += ` | Compliance: ${Math.round(s.compliancePct)}%`;
        if (s.notes) block += `\n    Noter: ${s.notes.slice(0, 200)}`;

        // Lap data (max 10 laps per session, max 5 sessions with laps)
        if (sessionBlocks.length < 5) {
          const laps = await db
            .select()
            .from(sessionLaps)
            .where(eq(sessionLaps.sessionId, s.id))
            .orderBy(sessionLaps.lapNumber)
            .limit(10);

          if (laps.length > 0) {
            const lapLines = laps.map((l) => {
              const lDur = `${Math.round(l.durationSeconds / 60)}min`;
              const lDist = l.distanceMeters ? `${(l.distanceMeters / 1000).toFixed(2)}km` : "";
              const lPace = l.avgPace ? `${Math.floor(l.avgPace / 60)}:${String(Math.round(l.avgPace % 60)).padStart(2, "0")}` : "";
              return `      Lap ${l.lapNumber}: ${lDur} ${lDist} HR=${l.avgHr ?? "?"} ${l.avgPower ? "P=" + l.avgPower + "W" : ""} ${lPace ? "pace=" + lPace : ""}`;
            });
            block += `\n    Laps (${laps.length}):\n${lapLines.join("\n")}`;
          }
        }

        sessionBlocks.push(block);
      }

      parts.push(`${header} (${recentSessions.length} sessioner):\n${sessionBlocks.join("\n\n")}`);
    } else {
      parts.push(`Ingen sessioner i de seneste ${weeks} uger${sport !== "all" ? ` for ${sport}` : ""}.`);
    }
  }

  // 4b. Selected sessions with FULL detail (user-picked)
  if (selectedSessionIds && selectedSessionIds.length > 0) {
    const selectedBlocks: string[] = [];
    for (const sid of selectedSessionIds.slice(0, 10)) {
      const [s] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, BigInt(sid)))
        .limit(1);

      if (!s) continue;

      const dur = s.durationSeconds ? `${Math.round(s.durationSeconds / 60)}min` : "?";
      const dist = s.distanceMeters ? `${(s.distanceMeters / 1000).toFixed(1)}km` : "N/A";
      const pace = s.avgPace ? `${Math.floor(s.avgPace / 60)}:${String(Math.round(s.avgPace % 60)).padStart(2, "0")} min/km` : "";

      let block = `  === ${s.startedAt.toISOString().slice(0, 10)} ${s.sport} "${s.title}" (${s.sessionType}) ===
    Varighed: ${dur} | Distance: ${dist} | TSS: ${s.tss?.toFixed(0) ?? "?"}
    HR: avg ${s.avgHr ?? "?"} / max ${s.maxHr ?? "?"} bpm`;
      if (s.avgPower || s.normalizedPower) block += ` | Power: avg ${s.avgPower ?? "?"}W / NP ${s.normalizedPower ?? "?"}W`;
      if (pace) block += ` | Pace: ${pace}`;
      if (s.avgCadence) block += ` | Kadence: ${s.avgCadence}`;
      if (s.elevationGain) block += ` | Hoejdemeter: ${s.elevationGain}m`;
      if (s.calories) block += ` | Kalorier: ${s.calories}`;
      if (s.rpe) block += `\n    RPE: ${s.rpe}/10`;
      if (s.compliancePct != null) block += ` | Compliance: ${Math.round(s.compliancePct)}%`;
      if (s.notes) block += `\n    Noter: ${s.notes.slice(0, 300)}`;

      // ALL laps for selected sessions
      const laps = await db
        .select()
        .from(sessionLaps)
        .where(eq(sessionLaps.sessionId, BigInt(sid)))
        .orderBy(sessionLaps.lapNumber);

      if (laps.length > 0) {
        const lapLines = laps.map((l) => {
          const lDur = `${Math.floor(l.durationSeconds / 60)}:${String(l.durationSeconds % 60).padStart(2, "0")}`;
          const lDist = l.distanceMeters ? `${(l.distanceMeters / 1000).toFixed(2)}km` : "";
          const lPace = l.avgPace ? `${Math.floor(l.avgPace / 60)}:${String(Math.round(l.avgPace % 60)).padStart(2, "0")}` : "";
          return `      Lap ${l.lapNumber}: ${lDur} | ${lDist} | HR avg=${l.avgHr ?? "?"} max=${l.maxHr ?? "?"} | ${l.avgPower ? "Power=" + l.avgPower + "W" : ""} ${lPace ? "Pace=" + lPace : ""} ${l.avgCadence ? "Cad=" + l.avgCadence : ""}`;
        });
        block += `\n    Laps (${laps.length}):\n${lapLines.join("\n")}`;
      }

      selectedBlocks.push(block);
    }

    if (selectedBlocks.length > 0) {
      parts.push(`UDVALGTE SESSIONER MED FULD DETALJE (${selectedBlocks.length}):\n${selectedBlocks.join("\n\n")}`);
    }
  }

  // 5. Active goals
  if (includeGoals) {
    const activeGoals = await db
      .select({ title: goals.title, targetDate: goals.targetDate, raceSubType: goals.raceSubType, racePriority: goals.racePriority })
      .from(goals)
      .where(and(eq(goals.athleteId, athleteId), eq(goals.status, "active")))
      .orderBy(asc(goals.targetDate))
      .limit(3);

    if (activeGoals.length > 0) {
      const goalStr = activeGoals.map((g) => {
        const daysUntil = g.targetDate ? Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / 86400000) : null;
        return `  - ${g.title} (${g.raceSubType ?? "race"}, prioritet: ${g.racePriority ?? "?"})${daysUntil != null ? ` — ${daysUntil} dage til race` : ""}`;
      }).join("\n");
      parts.push(`AKTIVE MAAL:\n${goalStr}`);
    }
  }

  // 6. Coaching preferences (communication style)
  const [prefs] = await db
    .select({ communicationStyle: aiCoachingPreferences.communicationStyle, focusAreas: aiCoachingPreferences.focusAreas })
    .from(aiCoachingPreferences)
    .where(eq(aiCoachingPreferences.athleteId, athleteId))
    .limit(1);

  if (prefs) {
    const styleMap: Record<string, string> = {
      concise: "Hold svar korte og praecise.",
      detailed: "Giv detaljerede forklaringer.",
      motivational: "Vaer opmuntrende og motiverende.",
    };
    if (styleMap[prefs.communicationStyle]) parts.push(`KOMMUNIKATION: ${styleMap[prefs.communicationStyle]}`);
    const focus = prefs.focusAreas as string[] ?? [];
    if (focus.length > 0) parts.push(`FOKUSOMRAADER: ${focus.join(", ")}`);
  }

  // 7. Custom context from user
  if (customContext?.trim()) {
    parts.push(`EKSTRA KONTEKST FRA BRUGER: ${customContext.trim()}`);
  }

  // 8. Injury history
  try {
    const injResult = await db.execute(sql`
      SELECT injury_type, body_location, severity, injury_date, current_phase
      FROM injuries
      WHERE athlete_id = ${athleteId} AND resolved_date IS NULL
      ORDER BY injury_date DESC LIMIT 5
    `);
    const injuries = injResult.rows as any[];
    if (injuries.length > 0) {
      const injStr = injuries.map((i) => `  - ${i.injury_type} (${i.body_location}), ${i.severity}, fase: ${i.current_phase ?? "ukendt"}`).join("\n");
      parts.push(`AKTIVE SKADER:\n${injStr}`);
    }
  } catch { /* injuries table may not exist */ }

  return parts.join("\n\n");
}
