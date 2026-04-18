/**
 * Alert Engine — evaluates athlete data against thresholds and creates ai_alerts.
 *
 * Thresholds based on: Banister impulse-response model, Coggan PMC,
 * Foster et al. (1998) monotony/strain, Plews et al. (2013) HRV.
 */

import { db } from "../../infrastructure/database/connection.js";
import { aiAlerts } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { athletePmc } from "../../infrastructure/database/schema/analytics.schema.js";
import { sessions } from "../../infrastructure/database/schema/training.schema.js";
import { wellnessDaily } from "../../infrastructure/database/schema/wellness.schema.js";
import { plannedSessions } from "../../infrastructure/database/schema/training.schema.js";
import { eq, and, gte, desc, sql } from "drizzle-orm";

// ── Thresholds ─────────────────────────────────────────────────────────

const THRESHOLDS = {
  overtraining: { warning: -20, critical: -30 },
  injuryRisk: { warning: 7, critical: 10 },     // CTL ramp per week
  undertraining: { info: 3, warning: 5, critical: 7 }, // consecutive rest days
  monotony: { warning: 1.5, critical: 2.0 },
  hrvDrop: { warning: 15, critical: 25 },        // % drop from baseline
  sleep: { warning: 7.0, critical: 6.5 },        // weekly average hours
} as const;

type AlertSeverity = "info" | "warning" | "critical";

interface AlertCandidate {
  alertType: string;
  severity: AlertSeverity;
  title: string;
  message: string;
}

// ── Main evaluate function ─────────────────────────────────────────────

export async function evaluateAlerts(athleteId: string): Promise<{ created: number }> {
  const candidates: AlertCandidate[] = [];

  // 1. TSB / Overtraining check
  const [latestPmc] = await db
    .select({ tsb: athletePmc.tsb, ctl: athletePmc.ctl, atl: athletePmc.atl, rampRate: athletePmc.rampRate })
    .from(athletePmc)
    .where(and(eq(athletePmc.athleteId, athleteId), eq(athletePmc.sport, "all")))
    .orderBy(desc(athletePmc.date))
    .limit(1);

  if (latestPmc) {
    if (latestPmc.tsb <= THRESHOLDS.overtraining.critical) {
      candidates.push({
        alertType: "overtraining",
        severity: "critical",
        title: "Kritisk overtraening",
        message: `Din TSB er ${Math.round(latestPmc.tsb)} — dette indikerer non-funktionel overreach. Overvaej at reducere belastning markant.`,
      });
    } else if (latestPmc.tsb <= THRESHOLDS.overtraining.warning) {
      candidates.push({
        alertType: "overtraining",
        severity: "warning",
        title: "Hoej traethed",
        message: `Din TSB er ${Math.round(latestPmc.tsb)} — du er i funktionel overreach zone. Sorg for tilstraekkelig restitution.`,
      });
    }

    // 2. Ramp rate / Injury risk
    if (latestPmc.rampRate != null) {
      const ramp = Math.abs(latestPmc.rampRate);
      if (ramp >= THRESHOLDS.injuryRisk.critical) {
        candidates.push({
          alertType: "injury_risk",
          severity: "critical",
          title: "Hoej skadesrisiko",
          message: `Din ugentlige belastningsoegning er ${ramp.toFixed(1)} CTL-points — det overskrider den sikre graense. Reducer volumen.`,
        });
      } else if (ramp >= THRESHOLDS.injuryRisk.warning) {
        candidates.push({
          alertType: "injury_risk",
          severity: "warning",
          title: "Stigende skadesrisiko",
          message: `Din ugentlige belastningsoegning er ${ramp.toFixed(1)} CTL-points — vaer opmaerksom paa restitution.`,
        });
      }
    }
  }

  // 3. Undertraining — consecutive days without sessions
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentSessions = await db
    .select({ startedAt: sessions.startedAt })
    .from(sessions)
    .where(and(eq(sessions.athleteId, athleteId), gte(sessions.startedAt, sevenDaysAgo)))
    .orderBy(desc(sessions.startedAt));

  if (recentSessions.length === 0) {
    candidates.push({
      alertType: "undertraining",
      severity: "critical",
      title: "Ingen traening i 7+ dage",
      message: "Du har ikke registreret traening i over 7 dage. Din CTL falder markant.",
    });
  } else {
    // Check consecutive rest days from today backwards
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDates = new Set(recentSessions.map((s) => s.startedAt.toISOString().slice(0, 10)));
    let restDays = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (!sessionDates.has(d.toISOString().slice(0, 10))) {
        restDays++;
      } else {
        break;
      }
    }
    if (restDays >= THRESHOLDS.undertraining.warning) {
      candidates.push({
        alertType: "undertraining",
        severity: "warning",
        title: `${restDays} hviledage i traek`,
        message: `Du har ikke traenet i ${restDays} dage. Overvaej en let session for at vedligeholde formen.`,
      });
    }
  }

  // 4. HRV drop check
  const hrvData = await db
    .select({ hrvMssd: wellnessDaily.hrvMssd })
    .from(wellnessDaily)
    .where(and(eq(wellnessDaily.athleteId, athleteId), sql`${wellnessDaily.hrvMssd} IS NOT NULL`))
    .orderBy(desc(wellnessDaily.date))
    .limit(7);

  if (hrvData.length >= 3) {
    const latest = hrvData[0].hrvMssd!;
    const baseline = hrvData.reduce((s, h) => s + h.hrvMssd!, 0) / hrvData.length;
    if (baseline > 0) {
      const dropPct = ((baseline - latest) / baseline) * 100;
      if (dropPct >= THRESHOLDS.hrvDrop.critical) {
        candidates.push({
          alertType: "hrv_drop",
          severity: "critical",
          title: "Kritisk HRV-fald",
          message: `Din HRV er faldet ${Math.round(dropPct)}% fra din baseline. Overvaej hvile eller let traening.`,
        });
      } else if (dropPct >= THRESHOLDS.hrvDrop.warning) {
        candidates.push({
          alertType: "hrv_drop",
          severity: "warning",
          title: "HRV under baseline",
          message: `Din HRV er ${Math.round(dropPct)}% under din 7-dages baseline. Prioriter restitution.`,
        });
      }
    }
  }

  // 5. Sleep check (weekly average)
  const sleepData = await db
    .select({ sleepHours: wellnessDaily.sleepHours })
    .from(wellnessDaily)
    .where(and(eq(wellnessDaily.athleteId, athleteId), sql`${wellnessDaily.sleepHours} IS NOT NULL`))
    .orderBy(desc(wellnessDaily.date))
    .limit(7);

  if (sleepData.length >= 3) {
    const avgSleep = sleepData.reduce((s, d) => s + (d.sleepHours ?? 0), 0) / sleepData.length;
    if (avgSleep < THRESHOLDS.sleep.critical) {
      candidates.push({
        alertType: "sleep_deprivation",
        severity: "critical",
        title: "Kritisk soevnmangel",
        message: `Dit 7-dages soevngennemsnit er ${avgSleep.toFixed(1)} timer — under den kritiske graense. Soevn er afgoeende for restitution.`,
      });
    } else if (avgSleep < THRESHOLDS.sleep.warning) {
      candidates.push({
        alertType: "sleep_deprivation",
        severity: "warning",
        title: "Lav soevn",
        message: `Dit 7-dages soevngennemsnit er ${avgSleep.toFixed(1)} timer — under de anbefalede 7+ timer for udholdenhedsatleter.`,
      });
    }
  }

  // 6. RPE vs actual intensity mismatch
  // Compare RPE with TSS and planned TSS to detect discrepancies
  const recentWithRpe = await db
    .select({
      id: sessions.id,
      rpe: sessions.rpe,
      tss: sessions.tss,
      title: sessions.title,
      plannedSessionId: sessions.plannedSessionId,
    })
    .from(sessions)
    .where(and(eq(sessions.athleteId, athleteId), gte(sessions.startedAt, sevenDaysAgo), sql`${sessions.rpe} IS NOT NULL`))
    .orderBy(desc(sessions.startedAt))
    .limit(5);

  for (const sess of recentWithRpe) {
    const rpe = sess.rpe!;
    const tss = sess.tss ?? 0;

    // High RPE (≥8) but low TSS (<40) — fatigue / illness signal
    if (rpe >= 8 && tss < 40 && tss > 0) {
      candidates.push({
        alertType: "rpe_mismatch",
        severity: "warning",
        title: "Hoej RPE, lav belastning",
        message: `"${sess.title}" havde RPE ${rpe} men kun ${Math.round(tss)} TSS. Hoej anstrengelse med lav belastning kan indikere traethed eller begyndende sygdom.`,
      });
      break; // one RPE alert per evaluation
    }

    // Check vs planned TSS if a planned session is linked
    if (sess.plannedSessionId) {
      const [planned] = await db
        .select({ targetTss: plannedSessions.targetTss })
        .from(plannedSessions)
        .where(eq(plannedSessions.id, sess.plannedSessionId))
        .limit(1);

      if (planned?.targetTss && planned.targetTss > 0) {
        const ratio = tss / planned.targetTss;
        // Actual TSS >50% over planned
        if (ratio > 1.5) {
          candidates.push({
            alertType: "rpe_mismatch",
            severity: "warning",
            title: "Traeningsbelastning over plan",
            message: `"${sess.title}" havde ${Math.round(tss)} TSS mod planlagt ${Math.round(planned.targetTss)} TSS (${Math.round(ratio * 100)}%). Overvaej at justere kommende traening.`,
          });
          break;
        }
      }
    }
  }

  // Create alerts (skip if same type+severity already exists unacknowledged)
  let created = 0;
  for (const candidate of candidates) {
    // Check for existing unacknowledged alert of same type
    const [existing] = await db
      .select({ id: aiAlerts.id })
      .from(aiAlerts)
      .where(
        and(
          eq(aiAlerts.athleteId, athleteId),
          eq(aiAlerts.alertType, candidate.alertType),
          eq(aiAlerts.acknowledged, false)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(aiAlerts).values({
        athleteId,
        alertType: candidate.alertType,
        severity: candidate.severity,
        title: candidate.title,
        message: candidate.message,
      });
      created++;
    }
  }

  return { created };
}
