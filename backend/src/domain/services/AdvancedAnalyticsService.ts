/**
 * Advanced AI-Powered Analytics (S28)
 * Decoupling analysis, season benchmarking, taper prediction, discipline balance, training age.
 */

import { db } from "../../infrastructure/database/connection.js";
import { sessions } from "../../infrastructure/database/schema/training.schema.js";
import { athletePmc } from "../../infrastructure/database/schema/analytics.schema.js";
import { athletes } from "../../infrastructure/database/schema/athlete.schema.js";
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";

// ── 28a. Decoupling Trend ───────────────────────────────────────────

export interface DecouplingTrend {
  sessions: Array<{ date: string; sport: string; decoupling: number; duration: number }>;
  avgDecoupling: number;
  trend: "improving" | "stable" | "declining" | "insufficient";
}

export async function getDecouplingTrend(athleteId: string, sport = "all", weeks = 12): Promise<DecouplingTrend> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  const conditions = [eq(sessions.athleteId, athleteId), gte(sessions.startedAt, startDate)];
  if (sport !== "all") conditions.push(eq(sessions.sport, sport));

  // Get sessions with analytics
  const rows = await db.execute(sql`
    SELECT s.started_at, s.sport, s.duration_seconds,
      sa.decoupling
    FROM sessions s
    LEFT JOIN session_analytics sa ON sa.session_id = s.id
    WHERE s.athlete_id = ${athleteId}
      AND s.started_at >= ${startDate}
      AND s.duration_seconds > 2400
      ${sport !== "all" ? sql`AND s.sport = ${sport}` : sql``}
    ORDER BY s.started_at
  `);

  const dataPoints = (rows.rows as any[])
    .filter((r) => r.decoupling != null)
    .map((r) => ({
      date: new Date(r.started_at).toISOString().slice(0, 10),
      sport: r.sport,
      decoupling: Number(r.decoupling),
      duration: Number(r.duration_seconds),
    }));

  const avgDecoupling = dataPoints.length > 0
    ? Math.round((dataPoints.reduce((s, d) => s + d.decoupling, 0) / dataPoints.length) * 10) / 10
    : 0;

  // Trend: compare first half vs second half average
  let trend: "improving" | "stable" | "declining" | "insufficient" = "insufficient";
  if (dataPoints.length >= 4) {
    const mid = Math.floor(dataPoints.length / 2);
    const firstAvg = dataPoints.slice(0, mid).reduce((s, d) => s + d.decoupling, 0) / mid;
    const secondAvg = dataPoints.slice(mid).reduce((s, d) => s + d.decoupling, 0) / (dataPoints.length - mid);
    const diff = secondAvg - firstAvg;
    trend = diff < -1 ? "improving" : diff > 1 ? "declining" : "stable";
  }

  return { sessions: dataPoints, avgDecoupling, trend };
}

// ── 28b. Season-over-Season Benchmarking ────────────────────────────

export interface SeasonBenchmark {
  currentYear: { ctl: number; weeklyHours: number; date: string } | null;
  previousYear: { ctl: number; weeklyHours: number; date: string } | null;
  ctlDifference: number | null;
  hoursDifference: number | null;
  assessment: string;
}

export async function getSeasonBenchmark(athleteId: string): Promise<SeasonBenchmark> {
  const now = new Date();
  const lastYear = new Date(now);
  lastYear.setFullYear(lastYear.getFullYear() - 1);

  // Current year CTL (latest)
  const [currentPmc] = await db
    .select({ ctl: athletePmc.ctl, date: athletePmc.date })
    .from(athletePmc)
    .where(and(eq(athletePmc.athleteId, athleteId), eq(athletePmc.sport, "all")))
    .orderBy(desc(athletePmc.date))
    .limit(1);

  // Previous year CTL (same date ± 7 days)
  const prevStart = new Date(lastYear);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(lastYear);
  prevEnd.setDate(prevEnd.getDate() + 7);

  const [prevPmc] = await db
    .select({ ctl: athletePmc.ctl, date: athletePmc.date })
    .from(athletePmc)
    .where(and(
      eq(athletePmc.athleteId, athleteId),
      eq(athletePmc.sport, "all"),
      gte(athletePmc.date, prevStart),
      lte(athletePmc.date, prevEnd)
    ))
    .orderBy(desc(athletePmc.date))
    .limit(1);

  // Weekly hours comparison
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const [currentHours] = await db
    .select({ total: sql<number>`COALESCE(SUM(duration_seconds), 0)` })
    .from(sessions)
    .where(and(eq(sessions.athleteId, athleteId), gte(sessions.startedAt, fourWeeksAgo)));

  const prevFourWeeksStart = new Date(lastYear);
  prevFourWeeksStart.setDate(prevFourWeeksStart.getDate() - 28);
  const [prevHours] = await db
    .select({ total: sql<number>`COALESCE(SUM(duration_seconds), 0)` })
    .from(sessions)
    .where(and(
      eq(sessions.athleteId, athleteId),
      gte(sessions.startedAt, prevFourWeeksStart),
      lte(sessions.startedAt, lastYear)
    ));

  const currentWeeklyHours = Math.round(((currentHours?.total ?? 0) / 3600 / 4) * 10) / 10;
  const prevWeeklyHours = Math.round(((prevHours?.total ?? 0) / 3600 / 4) * 10) / 10;
  const ctlDiff = currentPmc && prevPmc ? Math.round((currentPmc.ctl - prevPmc.ctl) * 10) / 10 : null;

  let assessment = "Utilstraekkelig data til sammenligning.";
  if (currentPmc && prevPmc) {
    if (currentPmc.ctl > prevPmc.ctl + 5) {
      assessment = `Du er ${Math.round(currentPmc.ctl - prevPmc.ctl)} CTL-points foran samme tidspunkt sidste aar. Godt arbejde!`;
    } else if (currentPmc.ctl < prevPmc.ctl - 5) {
      assessment = `Du er ${Math.round(prevPmc.ctl - currentPmc.ctl)} CTL-points bagud i forhold til samme tidspunkt sidste aar.`;
    } else {
      assessment = "Din form er paa niveau med samme tidspunkt sidste aar.";
    }
  }

  return {
    currentYear: currentPmc ? { ctl: Math.round(currentPmc.ctl * 10) / 10, weeklyHours: currentWeeklyHours, date: currentPmc.date.toISOString() } : null,
    previousYear: prevPmc ? { ctl: Math.round(prevPmc.ctl * 10) / 10, weeklyHours: prevWeeklyHours, date: prevPmc.date.toISOString() } : null,
    ctlDifference: ctlDiff,
    hoursDifference: currentWeeklyHours && prevWeeklyHours ? Math.round((currentWeeklyHours - prevWeeklyHours) * 10) / 10 : null,
    assessment,
  };
}

// ── 28d. Discipline Balance ─────────────────────────────────────────

export interface DisciplineBalance {
  actual: Record<string, number>;  // hours per sport
  recommended: Record<string, number>;  // recommended hours per sport
  imbalances: string[];
}

export async function getDisciplineBalance(athleteId: string): Promise<DisciplineBalance> {
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const rows = await db.execute(sql`
    SELECT sport, ROUND(SUM(duration_seconds)::numeric / 3600, 1) AS hours
    FROM sessions
    WHERE athlete_id = ${athleteId} AND started_at >= ${fourWeeksAgo}
    GROUP BY sport
  `);

  const actual: Record<string, number> = {};
  let totalHours = 0;
  for (const r of rows.rows as any[]) {
    actual[r.sport] = Number(r.hours);
    totalHours += Number(r.hours);
  }

  // Recommended split for triathlon (general Ironman recommendations)
  const recommended: Record<string, number> = {
    swim: Math.round(totalHours * 0.15 * 10) / 10,
    bike: Math.round(totalHours * 0.45 * 10) / 10,
    run: Math.round(totalHours * 0.30 * 10) / 10,
    strength: Math.round(totalHours * 0.10 * 10) / 10,
  };

  const imbalances: string[] = [];
  for (const [sport, recHours] of Object.entries(recommended)) {
    const actHours = actual[sport] ?? 0;
    if (recHours > 0) {
      const ratio = actHours / recHours;
      if (ratio < 0.6) imbalances.push(`${sport} er undertranset (${actHours}t vs anbefalet ${recHours}t)`);
      else if (ratio > 1.5) imbalances.push(`${sport} er overtranset (${actHours}t vs anbefalet ${recHours}t)`);
    }
  }

  return { actual, recommended, imbalances };
}

// ── 28c. Taper Response Prediction ──────────────────────────────────

export interface TaperPrediction {
  historicalTapers: number;
  predictedRaceDayCTL: number | null;
  predictedTSB: number | null;
  estimatedPerformanceGain: number | null;  // percentage
  confidence: "low" | "medium" | "high";
  note: string;
}

export async function predictTaperResponse(athleteId: string, taperWeeks = 3): Promise<TaperPrediction> {
  // Get current PMC
  const [currentPmc] = await db
    .select({ ctl: athletePmc.ctl, atl: athletePmc.atl, tsb: athletePmc.tsb })
    .from(athletePmc)
    .where(and(eq(athletePmc.athleteId, athleteId), eq(athletePmc.sport, "all")))
    .orderBy(desc(athletePmc.date))
    .limit(1);

  if (!currentPmc) {
    return { historicalTapers: 0, predictedRaceDayCTL: null, predictedTSB: null, estimatedPerformanceGain: null, confidence: "low", note: "Utilstraekkelig PMC-data." };
  }

  // Estimate taper response using exponential decay model
  // CTL decays ~3-5% per week during taper, ATL decays faster (~10-15% per week)
  const ctlDecayPerWeek = 0.04; // 4%
  const atlDecayPerWeek = 0.12; // 12%

  const predictedCTL = currentPmc.ctl * Math.pow(1 - ctlDecayPerWeek, taperWeeks);
  const predictedATL = currentPmc.atl * Math.pow(1 - atlDecayPerWeek, taperWeeks);
  const predictedTSB = predictedCTL - predictedATL;

  // Performance gain typically 2-6% from proper taper
  // Higher TSB improvement = more gain, but diminishing returns
  const tsbImprovement = predictedTSB - currentPmc.tsb;
  const estimatedGain = Math.min(6, Math.max(1, tsbImprovement * 0.1));

  return {
    historicalTapers: 0, // Would need historical race data to improve
    predictedRaceDayCTL: Math.round(predictedCTL * 10) / 10,
    predictedTSB: Math.round(predictedTSB * 10) / 10,
    estimatedPerformanceGain: Math.round(estimatedGain * 10) / 10,
    confidence: "medium",
    note: `Baseret paa ${taperWeeks}-ugers taper fra CTL ${Math.round(currentPmc.ctl)}. Forventet race-day TSB: ${Math.round(predictedTSB)} (optimal: +5 til +25).`,
  };
}

// ── 28e. Training Age & Adaptation Rate ─────────────────────────────

export interface TrainingAgeEstimate {
  estimatedTrainingYears: number;
  dataMonths: number;
  ctlGrowthRate: number; // CTL points per week
  adaptationRate: "fast" | "moderate" | "slow";
  expectedRate: string;
  assessment: string;
}

export async function estimateTrainingAge(athleteId: string): Promise<TrainingAgeEstimate> {
  // Get earliest and latest session dates
  const earliest = await db.execute(sql`
    SELECT MIN(started_at) as first_session FROM sessions WHERE athlete_id = ${athleteId}
  `);
  const latest = await db.execute(sql`
    SELECT MAX(started_at) as last_session FROM sessions WHERE athlete_id = ${athleteId}
  `);

  const firstDate = (earliest.rows as any[])[0]?.first_session;
  const lastDate = (latest.rows as any[])[0]?.last_session;

  if (!firstDate || !lastDate) {
    return { estimatedTrainingYears: 0, dataMonths: 0, ctlGrowthRate: 0, adaptationRate: "moderate", expectedRate: "N/A", assessment: "Ingen traenigsdata tilgaengelig." };
  }

  const dataMonths = Math.max(1, Math.round((new Date(lastDate).getTime() - new Date(firstDate).getTime()) / (30 * 86400000)));

  // Get CTL trend (first month vs last month)
  const firstMonthEnd = new Date(firstDate);
  firstMonthEnd.setMonth(firstMonthEnd.getMonth() + 1);
  const lastMonthStart = new Date(lastDate);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

  const [firstCTL] = await db
    .select({ ctl: athletePmc.ctl })
    .from(athletePmc)
    .where(and(eq(athletePmc.athleteId, athleteId), eq(athletePmc.sport, "all"), gte(athletePmc.date, new Date(firstDate))))
    .orderBy(asc(athletePmc.date))
    .limit(1);

  const [lastCTL] = await db
    .select({ ctl: athletePmc.ctl })
    .from(athletePmc)
    .where(and(eq(athletePmc.athleteId, athleteId), eq(athletePmc.sport, "all")))
    .orderBy(desc(athletePmc.date))
    .limit(1);

  const ctlChange = (lastCTL?.ctl ?? 0) - (firstCTL?.ctl ?? 0);
  const weeks = Math.max(1, dataMonths * 4.33);
  const ctlGrowthRate = Math.round((ctlChange / weeks) * 10) / 10;

  // Estimate training age from growth rate
  // Beginners: 2-4 CTL/week, intermediate: 1-2, advanced: 0.5-1, elite: <0.5
  let estimatedYears: number;
  let adaptationRate: "fast" | "moderate" | "slow";
  let expectedRate: string;

  if (ctlGrowthRate > 2) {
    estimatedYears = Math.max(0, Math.min(2, dataMonths / 12));
    adaptationRate = "fast";
    expectedRate = "2-4 CTL/uge (nybegynder)";
  } else if (ctlGrowthRate > 0.8) {
    estimatedYears = Math.max(1, Math.min(5, dataMonths / 12 + 1));
    adaptationRate = "moderate";
    expectedRate = "1-2 CTL/uge (intermediate)";
  } else {
    estimatedYears = Math.max(3, dataMonths / 12 + 2);
    adaptationRate = "slow";
    expectedRate = "<1 CTL/uge (erfaren)";
  }

  const assessment = ctlGrowthRate > 1.5
    ? `Din CTL-vaekst paa ${ctlGrowthRate} points/uge indikerer hurtig adaptation, typisk for en nybegynder-mellemstadie atlet.`
    : ctlGrowthRate > 0.5
    ? `Din CTL-vaekst paa ${ctlGrowthRate} points/uge er normal for en erfaren udholdenhedsatlet.`
    : ctlGrowthRate > 0
    ? `Din CTL-vaekst paa ${ctlGrowthRate} points/uge er langsom men stabil — typisk for en veteran.`
    : `Din CTL er stabil eller faldende. Overvaej at oege traenigsbelastningen progressivt.`;

  return {
    estimatedTrainingYears: Math.round(estimatedYears * 10) / 10,
    dataMonths,
    ctlGrowthRate,
    adaptationRate,
    expectedRate,
    assessment,
  };
}
