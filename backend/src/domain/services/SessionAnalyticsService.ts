/**
 * Deep Session Analytics (S15)
 * Calculates EF, decoupling, IF, VI, TRIMP, HRSS and compares with similar sessions.
 */

import { db } from "../../infrastructure/database/connection.js";
import { sessions, sessionTrackpoints } from "../../infrastructure/database/schema/training.schema.js";
import { athletes } from "../../infrastructure/database/schema/athlete.schema.js";
import { eq, and, desc, gte, lte, sql, ne } from "drizzle-orm";

export interface SessionDeepAnalytics {
  zoneDistribution: Record<string, number>; // z1-z5 in seconds
  zonePercentages: Record<string, number>;  // z1-z5 as %
  ef: number | null;                         // Efficiency Factor: NP / avgHR
  decoupling: number | null;                 // HR drift 1st vs 2nd half (%)
  intensityFactor: number | null;            // NP / FTP
  variabilityIndex: number | null;           // NP / avgPower
  trimp: number | null;                      // Training Impulse
  hrss: number | null;                       // Heart Rate Stress Score
  comparison: {
    recentSimilar: number;
    trend: "improving" | "stable" | "declining" | "insufficient";
    avgEf: number | null;
    avgDecoupling: number | null;
  };
}

export async function calculateDeepAnalytics(
  sessionId: number,
  athleteId: string
): Promise<SessionDeepAnalytics> {
  // Get session data
  const [sess] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, BigInt(sessionId)))
    .limit(1);

  if (!sess) throw new Error("Session ikke fundet");

  // Get athlete thresholds
  const [athlete] = await db
    .select({ maxHr: athletes.maxHr, restingHr: athletes.restingHr, ftp: athletes.ftp, lthr: athletes.lthr })
    .from(athletes)
    .where(eq(athletes.id, athleteId))
    .limit(1);

  const maxHr = athlete?.maxHr ?? 190;
  const restingHr = athlete?.restingHr ?? 50;
  const ftp = athlete?.ftp ?? 200;
  const lthr = athlete?.lthr ?? Math.round(maxHr * 0.85);
  const hrReserve = maxHr - restingHr;

  // Zone boundaries (5-zone model based on LTHR)
  const zoneBounds = [
    { zone: "z1", min: 0, max: Math.round(lthr * 0.81) },
    { zone: "z2", min: Math.round(lthr * 0.81), max: Math.round(lthr * 0.90) },
    { zone: "z3", min: Math.round(lthr * 0.90), max: Math.round(lthr * 0.95) },
    { zone: "z4", min: Math.round(lthr * 0.95), max: Math.round(lthr * 1.05) },
    { zone: "z5", min: Math.round(lthr * 1.05), max: 999 },
  ];

  // Get trackpoints for detailed analysis
  const trackpoints = await db
    .select({ hr: sessionTrackpoints.heartRate, power: sessionTrackpoints.power, timestamp: sessionTrackpoints.timestamp })
    .from(sessionTrackpoints)
    .where(eq(sessionTrackpoints.sessionId, BigInt(sessionId)))
    .orderBy(sessionTrackpoints.timestamp);

  // Zone distribution from trackpoints (or estimate from avgHR)
  const zoneDistribution: Record<string, number> = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
  const duration = sess.durationSeconds ?? 0;

  if (trackpoints.length > 10) {
    for (const tp of trackpoints) {
      const hr = tp.hr ?? 0;
      for (const zb of zoneBounds) {
        if (hr >= zb.min && hr < zb.max) {
          zoneDistribution[zb.zone] += 1; // each trackpoint ~1 second
          break;
        }
      }
    }
  } else if (sess.avgHr) {
    // Estimate from avgHR — assume bell curve around average
    const avgHr = sess.avgHr;
    for (const zb of zoneBounds) {
      if (avgHr >= zb.min && avgHr < zb.max) {
        zoneDistribution[zb.zone] = Math.round(duration * 0.6);
        // Distribute remaining
        const idx = zoneBounds.indexOf(zb);
        if (idx > 0) zoneDistribution[zoneBounds[idx - 1].zone] = Math.round(duration * 0.25);
        if (idx < 4) zoneDistribution[zoneBounds[idx + 1].zone] = Math.round(duration * 0.15);
        break;
      }
    }
  }

  const totalZoneTime = Object.values(zoneDistribution).reduce((s, v) => s + v, 0) || 1;
  const zonePercentages: Record<string, number> = {};
  for (const [k, v] of Object.entries(zoneDistribution)) {
    zonePercentages[k] = Math.round((v / totalZoneTime) * 100);
  }

  // Efficiency Factor: NP / avgHR
  const np = sess.normalizedPower ?? sess.avgPower;
  const avgHr = sess.avgHr;
  const ef = np && avgHr && avgHr > 0 ? Math.round((np / avgHr) * 100) / 100 : null;

  // Decoupling: compare avg HR in 1st half vs 2nd half
  let decoupling: number | null = null;
  if (trackpoints.length > 20) {
    const mid = Math.floor(trackpoints.length / 2);
    const firstHalf = trackpoints.slice(0, mid).filter((t) => t.hr);
    const secondHalf = trackpoints.slice(mid).filter((t) => t.hr);
    if (firstHalf.length > 5 && secondHalf.length > 5) {
      const avgHr1 = firstHalf.reduce((s, t) => s + (t.hr ?? 0), 0) / firstHalf.length;
      const avgHr2 = secondHalf.reduce((s, t) => s + (t.hr ?? 0), 0) / secondHalf.length;
      if (avgHr1 > 0) {
        decoupling = Math.round(((avgHr2 - avgHr1) / avgHr1) * 1000) / 10; // percentage
      }
    }
  }

  // Intensity Factor: NP / FTP
  const intensityFactor = np && ftp > 0 ? Math.round((np / ftp) * 100) / 100 : null;

  // Variability Index: NP / avgPower
  const variabilityIndex = np && sess.avgPower && sess.avgPower > 0
    ? Math.round((np / sess.avgPower) * 100) / 100
    : null;

  // TRIMP: duration(min) × ΔHR-ratio × weighting
  let trimp: number | null = null;
  if (avgHr && duration > 0) {
    const durationMin = duration / 60;
    const hrRatio = (avgHr - restingHr) / hrReserve;
    const gender = 1; // male coefficient; female = 1.67
    const y = hrRatio > 0 ? Math.exp(1.92 * hrRatio * gender) : 1;
    trimp = Math.round(durationMin * hrRatio * 0.64 * y);
  }

  // HRSS: (session TRIMP / 1-hour LTHR TRIMP) × 100
  let hrss: number | null = null;
  if (trimp != null && lthr > 0) {
    const lthrRatio = (lthr - restingHr) / hrReserve;
    const lthrY = Math.exp(1.92 * lthrRatio * 1);
    const trimpPerHourAtLthr = 60 * lthrRatio * 0.64 * lthrY;
    if (trimpPerHourAtLthr > 0) {
      hrss = Math.round((trimp / trimpPerHourAtLthr) * 100);
    }
  }

  // Comparison with 5 similar sessions (same sport, ±30% duration)
  const durationMin = (duration * 0.7);
  const durationMax = (duration * 1.3);
  const similar = await db
    .select({
      id: sessions.id,
      avgHr: sessions.avgHr,
      avgPower: sessions.avgPower,
      normalizedPower: sessions.normalizedPower,
      durationSeconds: sessions.durationSeconds,
      tss: sessions.tss,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.athleteId, athleteId),
        eq(sessions.sport, sess.sport),
        ne(sessions.id, BigInt(sessionId)),
        gte(sessions.durationSeconds, Math.round(durationMin)),
        lte(sessions.durationSeconds, Math.round(durationMax))
      )
    )
    .orderBy(desc(sessions.startedAt))
    .limit(5);

  let trend: "improving" | "stable" | "declining" | "insufficient" = "insufficient";
  let avgEf: number | null = null;
  let avgDecoupling: number | null = null;

  if (similar.length >= 3) {
    const similarEfs = similar
      .filter((s) => s.normalizedPower && s.avgHr && s.avgHr > 0)
      .map((s) => (s.normalizedPower ?? s.avgPower ?? 0) / s.avgHr!);

    if (similarEfs.length >= 2) {
      avgEf = Math.round((similarEfs.reduce((s, v) => s + v, 0) / similarEfs.length) * 100) / 100;
      if (ef && avgEf > 0) {
        const diff = ((ef - avgEf) / avgEf) * 100;
        trend = diff > 3 ? "improving" : diff < -3 ? "declining" : "stable";
      }
    }
  }

  return {
    zoneDistribution,
    zonePercentages,
    ef,
    decoupling,
    intensityFactor,
    variabilityIndex,
    trimp,
    hrss,
    comparison: {
      recentSimilar: similar.length,
      trend,
      avgEf,
      avgDecoupling,
    },
  };
}
