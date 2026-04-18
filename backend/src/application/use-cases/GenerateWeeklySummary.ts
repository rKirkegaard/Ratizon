import { db } from "../../infrastructure/database/connection.js";
import { aiWeeklySummaries } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { sessions } from "../../infrastructure/database/schema/training.schema.js";
import { athletePmc } from "../../infrastructure/database/schema/analytics.schema.js";
import { wellnessDaily } from "../../infrastructure/database/schema/wellness.schema.js";
import { generateCompletion } from "../../infrastructure/llm/LLMClient.js";
import { eq, and, gte, lte, desc } from "drizzle-orm";

const SYSTEM_PROMPT = `Du er en ekspert triatlon-coach AI. Du laver ugentlige opsummeringer af en atlets traening paa dansk.

Returner dit svar som JSON med disse felter:
{
  "summary": "2-4 saetninger der opsummerer ugen",
  "highlights": ["positivt punkt 1", "positivt punkt 2"],
  "concerns": ["bekymring 1"],
  "nextWeekFocus": ["fokusomraade 1", "fokusomraade 2"]
}

Vaer specifik, brug atletens data, og giv handlingsorienterede anbefalinger.`;

export async function getWeeklySummary(athleteId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [existing] = await db
    .select()
    .from(aiWeeklySummaries)
    .where(
      and(
        eq(aiWeeklySummaries.athleteId, athleteId),
        gte(aiWeeklySummaries.weekStart, weekStart),
        lte(aiWeeklySummaries.weekStart, weekEnd)
      )
    )
    .orderBy(desc(aiWeeklySummaries.generatedAt))
    .limit(1);

  if (!existing) return null;

  return {
    id: existing.id,
    summary: existing.summary,
    highlights: existing.highlights as string[],
    concerns: existing.concerns as string[],
    nextWeekFocus: existing.nextWeekFocus as string[],
    generatedAt: existing.generatedAt.toISOString(),
  };
}

export async function generateWeeklySummary(athleteId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Gather week's sessions
  const weekSessions = await db
    .select({
      sport: sessions.sport,
      title: sessions.title,
      durationSeconds: sessions.durationSeconds,
      distanceMeters: sessions.distanceMeters,
      tss: sessions.tss,
      avgHr: sessions.avgHr,
      avgPower: sessions.avgPower,
    })
    .from(sessions)
    .where(
      and(eq(sessions.athleteId, athleteId), gte(sessions.startedAt, weekStart), lte(sessions.startedAt, weekEnd))
    );

  // PMC at end of week
  const [pmc] = await db
    .select({ ctl: athletePmc.ctl, atl: athletePmc.atl, tsb: athletePmc.tsb })
    .from(athletePmc)
    .where(and(eq(athletePmc.athleteId, athleteId), lte(athletePmc.date, weekEnd)))
    .orderBy(desc(athletePmc.date))
    .limit(1);

  // Wellness averages
  const wellness = await db
    .select({ sleepHours: wellnessDaily.sleepHours, hrvMssd: wellnessDaily.hrvMssd, stressLevel: wellnessDaily.stressLevel })
    .from(wellnessDaily)
    .where(and(eq(wellnessDaily.athleteId, athleteId), gte(wellnessDaily.date, weekStart), lte(wellnessDaily.date, weekEnd)));

  // Build context
  const totalTss = weekSessions.reduce((s, sess) => s + (sess.tss ?? 0), 0);
  const totalHours = weekSessions.reduce((s, sess) => s + (sess.durationSeconds ?? 0), 0) / 3600;
  const sportBreakdown = weekSessions.reduce((acc, s) => {
    acc[s.sport] = (acc[s.sport] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgSleep = wellness.length > 0
    ? wellness.reduce((s, w) => s + (w.sleepHours ?? 0), 0) / wellness.length
    : null;

  const context = `Uge-data:
- Sessioner: ${weekSessions.length} (${Object.entries(sportBreakdown).map(([s, c]) => `${s}: ${c}`).join(", ")})
- Total TSS: ${Math.round(totalTss)}
- Total timer: ${totalHours.toFixed(1)}
- CTL: ${pmc?.ctl?.toFixed(0) ?? "?"}, ATL: ${pmc?.atl?.toFixed(0) ?? "?"}, TSB: ${pmc?.tsb?.toFixed(0) ?? "?"}
- Gns. soevn: ${avgSleep?.toFixed(1) ?? "?"} timer
`;

  const aiResponse = await generateCompletion(
    SYSTEM_PROMPT,
    context,
    { athleteId, requestType: "weekly_summary", maxTokens: 512 }
  );

  // Parse JSON response
  let parsed = { summary: aiResponse, highlights: [], concerns: [], nextWeekFocus: [] };
  try {
    const json = JSON.parse(aiResponse);
    if (json.summary) parsed = json;
  } catch {
    // LLM didn't return valid JSON — use raw text as summary
  }

  const [created] = await db
    .insert(aiWeeklySummaries)
    .values({
      athleteId,
      weekStart,
      summary: parsed.summary,
      highlights: parsed.highlights,
      concerns: parsed.concerns,
      nextWeekFocus: parsed.nextWeekFocus,
    })
    .returning();

  return {
    id: created.id,
    summary: created.summary,
    highlights: created.highlights as string[],
    concerns: created.concerns as string[],
    nextWeekFocus: created.nextWeekFocus as string[],
    generatedAt: created.generatedAt.toISOString(),
  };
}
