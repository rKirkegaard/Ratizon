/**
 * Mental Readiness & Burnout Prevention (S27)
 * Analyzes wellness data, engagement, and chat patterns to detect burnout risk.
 */

import { db } from "../../infrastructure/database/connection.js";
import { wellnessDaily } from "../../infrastructure/database/schema/wellness.schema.js";
import { sessions } from "../../infrastructure/database/schema/training.schema.js";
import { chatMessages } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { aiAlerts } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { eq, and, gte, desc, sql, count } from "drizzle-orm";

export interface MentalReadinessReport {
  motivationTrend: number | null;       // -1 to +1
  energyTrend: number | null;           // -1 to +1
  stressTrend: number | null;           // -1 to +1
  engagementScore: number;              // 0-100
  burnoutRisk: "low" | "moderate" | "high";
  indicators: string[];
  uploadFrequency: number;              // sessions per week (last 14 days)
  chatActivity: number;                 // messages last 14 days
  daysSinceLastUpload: number | null;
}

export async function assessMentalReadiness(athleteId: string): Promise<MentalReadinessReport> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // 1. Wellness trends (motivation, energy, stress)
  const wellness = await db
    .select({
      motivation: wellnessDaily.motivation,
      energy: wellnessDaily.energy,
      stress: wellnessDaily.stress,
      date: wellnessDaily.date,
    })
    .from(wellnessDaily)
    .where(and(eq(wellnessDaily.athleteId, athleteId), gte(wellnessDaily.date, fourteenDaysAgo)))
    .orderBy(wellnessDaily.date);

  // Calculate trends (simple: compare last 7 days avg vs previous 7 days)
  function calcTrend(values: (number | null)[]): number | null {
    const valid = values.filter((v): v is number => v != null);
    if (valid.length < 4) return null;
    const mid = Math.floor(valid.length / 2);
    const first = valid.slice(0, mid);
    const second = valid.slice(mid);
    const avg1 = first.reduce((s, v) => s + v, 0) / first.length;
    const avg2 = second.reduce((s, v) => s + v, 0) / second.length;
    const maxVal = 5; // 1-5 scale
    return Math.round(((avg2 - avg1) / maxVal) * 100) / 100;
  }

  const motivationTrend = calcTrend(wellness.map((w) => w.motivation));
  const energyTrend = calcTrend(wellness.map((w) => w.energy));
  const stressTrend = calcTrend(wellness.map((w) => w.stress));

  // 2. Upload frequency
  const recentSessions = await db
    .select({ count: count() })
    .from(sessions)
    .where(and(eq(sessions.athleteId, athleteId), gte(sessions.startedAt, fourteenDaysAgo)));

  const uploadFrequency = Math.round((Number(recentSessions[0]?.count ?? 0) / 2) * 10) / 10; // per week

  // 3. Days since last upload
  const [lastSession] = await db
    .select({ startedAt: sessions.startedAt })
    .from(sessions)
    .where(eq(sessions.athleteId, athleteId))
    .orderBy(desc(sessions.startedAt))
    .limit(1);

  const daysSinceLastUpload = lastSession
    ? Math.floor((Date.now() - new Date(lastSession.startedAt).getTime()) / 86400000)
    : null;

  // 4. Chat activity
  const chatCount = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM chat_messages cm
    JOIN chat_conversations cc ON cm.conversation_id = cc.id
    WHERE cc.athlete_id = ${athleteId}
      AND cm.role = 'user'
      AND cm.created_at >= ${fourteenDaysAgo}
  `);
  const chatActivity = Number((chatCount.rows as any[])[0]?.cnt ?? 0);

  // 5. Engagement score (0-100)
  let engagementScore = 50; // baseline
  engagementScore += Math.min(uploadFrequency * 5, 20); // up to +20 for regular uploads
  engagementScore += Math.min(chatActivity * 2, 15);     // up to +15 for chat
  engagementScore += wellness.length > 7 ? 10 : wellness.length * 1.5; // wellness logging
  if (daysSinceLastUpload != null && daysSinceLastUpload > 5) engagementScore -= 15;
  engagementScore = Math.max(0, Math.min(100, Math.round(engagementScore)));

  // 6. Burnout risk assessment
  const indicators: string[] = [];
  let riskScore = 0;

  if (motivationTrend != null && motivationTrend < -0.1) {
    indicators.push("Faldende motivation");
    riskScore += 2;
  }
  if (energyTrend != null && energyTrend < -0.1) {
    indicators.push("Faldende energi");
    riskScore += 2;
  }
  if (stressTrend != null && stressTrend > 0.1) {
    indicators.push("Stigende stress");
    riskScore += 1;
  }
  if (uploadFrequency < 2) {
    indicators.push("Lav upload-frekvens");
    riskScore += 1;
  }
  if (daysSinceLastUpload != null && daysSinceLastUpload >= 5) {
    indicators.push(`${daysSinceLastUpload} dage uden upload`);
    riskScore += 2;
  }
  if (engagementScore < 30) {
    indicators.push("Lavt engagement");
    riskScore += 1;
  }

  const burnoutRisk: "low" | "moderate" | "high" = riskScore >= 5 ? "high" : riskScore >= 3 ? "moderate" : "low";

  // Create alert if high risk
  if (burnoutRisk === "high") {
    const [existing] = await db
      .select({ id: aiAlerts.id })
      .from(aiAlerts)
      .where(and(eq(aiAlerts.athleteId, athleteId), eq(aiAlerts.alertType, "burnout_risk"), eq(aiAlerts.acknowledged, false)))
      .limit(1);

    if (!existing) {
      await db.insert(aiAlerts).values({
        athleteId,
        alertType: "burnout_risk",
        severity: "warning",
        title: "Burnout-risiko detekteret",
        message: `Indikatorer: ${indicators.join(", ")}. Overvaej at reducere belastning og have en samtale med atleten.`,
      });
    }
  }

  return {
    motivationTrend,
    energyTrend,
    stressTrend,
    engagementScore,
    burnoutRisk,
    indicators,
    uploadFrequency,
    chatActivity,
    daysSinceLastUpload,
  };
}
