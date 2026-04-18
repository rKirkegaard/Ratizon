import { db } from "../../infrastructure/database/connection.js";
import { aiMonthlySummaries } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { sessions } from "../../infrastructure/database/schema/training.schema.js";
import { athletePmc } from "../../infrastructure/database/schema/analytics.schema.js";
import { generateCompletion } from "../../infrastructure/llm/LLMClient.js";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

const SYSTEM_PROMPT = `Du er en ekspert triatlon-coach AI. Du laver maanedlige opsummeringer af en atlets traening paa dansk.

Returner dit svar som JSON:
{
  "summary": "3-5 saetninger der opsummerer maaneden",
  "highlights": ["positivt punkt 1", "positivt punkt 2"],
  "concerns": ["bekymring 1"],
  "nextMonthFocus": ["fokusomraade 1", "fokusomraade 2"]
}`;

export async function getMonthlySummary(athleteId: string, year: number, month: number) {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  const [existing] = await db
    .select()
    .from(aiMonthlySummaries)
    .where(
      and(
        eq(aiMonthlySummaries.athleteId, athleteId),
        gte(aiMonthlySummaries.monthStart, monthStart),
        lte(aiMonthlySummaries.monthStart, monthEnd)
      )
    )
    .orderBy(desc(aiMonthlySummaries.generatedAt))
    .limit(1);

  if (!existing) return null;
  return {
    id: existing.id,
    summary: existing.summary,
    highlights: existing.highlights as string[],
    concerns: existing.concerns as string[],
    nextMonthFocus: existing.nextMonthFocus as string[],
    generatedAt: existing.generatedAt.toISOString(),
  };
}

export async function generateMonthlySummary(athleteId: string, year: number, month: number) {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  // Sessions this month
  const monthSessions = await db
    .select({
      sport: sessions.sport,
      durationSeconds: sessions.durationSeconds,
      distanceMeters: sessions.distanceMeters,
      tss: sessions.tss,
    })
    .from(sessions)
    .where(and(eq(sessions.athleteId, athleteId), gte(sessions.startedAt, monthStart), lte(sessions.startedAt, monthEnd)));

  // PMC at start and end of month
  const [pmcEnd] = await db
    .select({ ctl: athletePmc.ctl, atl: athletePmc.atl, tsb: athletePmc.tsb })
    .from(athletePmc)
    .where(and(eq(athletePmc.athleteId, athleteId), lte(athletePmc.date, monthEnd)))
    .orderBy(desc(athletePmc.date))
    .limit(1);

  const [pmcStart] = await db
    .select({ ctl: athletePmc.ctl })
    .from(athletePmc)
    .where(and(eq(athletePmc.athleteId, athleteId), lte(athletePmc.date, monthStart)))
    .orderBy(desc(athletePmc.date))
    .limit(1);

  const totalTss = monthSessions.reduce((s, sess) => s + (sess.tss ?? 0), 0);
  const totalHours = monthSessions.reduce((s, sess) => s + (sess.durationSeconds ?? 0), 0) / 3600;
  const sportCounts = monthSessions.reduce((acc, s) => { acc[s.sport] = (acc[s.sport] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  const ctlDelta = pmcEnd && pmcStart ? (pmcEnd.ctl - pmcStart.ctl) : null;

  const context = `Maaneds-data (${year}-${String(month).padStart(2, "0")}):
- Sessioner: ${monthSessions.length} (${Object.entries(sportCounts).map(([s, c]) => `${s}: ${c}`).join(", ")})
- Total TSS: ${Math.round(totalTss)}
- Total timer: ${totalHours.toFixed(1)}
- CTL ved maanedens slut: ${pmcEnd?.ctl?.toFixed(0) ?? "?"} (aendring: ${ctlDelta != null ? (ctlDelta > 0 ? "+" : "") + ctlDelta.toFixed(0) : "?"})
- TSB: ${pmcEnd?.tsb?.toFixed(0) ?? "?"}
`;

  const aiResponse = await generateCompletion(SYSTEM_PROMPT, context, {
    athleteId,
    requestType: "monthly_summary",
    maxTokens: 600,
  });

  let parsed = { summary: aiResponse, highlights: [] as string[], concerns: [] as string[], nextMonthFocus: [] as string[] };
  try {
    const json = JSON.parse(aiResponse);
    if (json.summary) parsed = json;
  } catch { /* use raw */ }

  const [created] = await db
    .insert(aiMonthlySummaries)
    .values({
      athleteId,
      monthStart,
      summary: parsed.summary,
      highlights: parsed.highlights,
      concerns: parsed.concerns,
      nextMonthFocus: parsed.nextMonthFocus,
    })
    .returning();

  return {
    id: created.id,
    summary: created.summary,
    highlights: created.highlights as string[],
    concerns: created.concerns as string[],
    nextMonthFocus: created.nextMonthFocus as string[],
    generatedAt: created.generatedAt.toISOString(),
  };
}
