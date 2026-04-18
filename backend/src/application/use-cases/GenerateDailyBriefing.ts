import { db } from "../../infrastructure/database/connection.js";
import { aiDailyBriefings } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { wellnessDaily } from "../../infrastructure/database/schema/wellness.schema.js";
import { sessions } from "../../infrastructure/database/schema/training.schema.js";
import { plannedSessions } from "../../infrastructure/database/schema/training.schema.js";
import { athletePmc } from "../../infrastructure/database/schema/analytics.schema.js";
import { generateCompletion } from "../../infrastructure/llm/LLMClient.js";
import { aiCoachingPreferences } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { eq, and, gte, lte, desc } from "drizzle-orm";

const SYSTEM_PROMPT = `Du er en ekspert triatlon-coach AI for Ratizon platformen. Du giver daglige briefinger til atleter paa dansk.

Din briefing skal indeholde:
1. En kort opsummering af atletens nuvaerende tilstand (2-3 saetninger)
2. Anbefalinger for dagens traening (liste)
3. Eventuelle advarsler om overtraening, sygdom osv. (liste, kan vaere tom)
4. Fokusomraader (liste)

Svar i JSON format:
{
  "summary": "Kort opsummering...",
  "recommendations": ["Anbefaling 1", "Anbefaling 2"],
  "warnings": ["Advarsel 1"],
  "focusAreas": ["Fokusomraade 1"]
}

Vaar specifik og datadrevet. Brug de data der er tilgaengelige.`;

export interface DailyBriefingResult {
  id: string;
  summary: string;
  recommendations: string[];
  warnings: string[];
  focusAreas: string[];
  generatedAt: string;
}

/**
 * Get today's briefing for an athlete, or null if none exists.
 */
export async function getTodayBriefing(athleteId: string): Promise<DailyBriefingResult | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [briefing] = await db
    .select()
    .from(aiDailyBriefings)
    .where(
      and(
        eq(aiDailyBriefings.athleteId, athleteId),
        gte(aiDailyBriefings.date, today),
        lte(aiDailyBriefings.date, tomorrow)
      )
    )
    .orderBy(desc(aiDailyBriefings.generatedAt))
    .limit(1);

  if (!briefing) return null;

  return {
    id: briefing.id,
    summary: briefing.summary,
    recommendations: briefing.recommendations as string[],
    warnings: briefing.warnings as string[],
    focusAreas: briefing.focusAreas as string[],
    generatedAt: briefing.generatedAt.toISOString(),
  };
}

/**
 * Generate a new daily briefing for an athlete.
 */
export async function generateDailyBriefing(athleteId: string): Promise<DailyBriefingResult> {
  // Gather context data
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Latest wellness
  const [latestWellness] = await db
    .select()
    .from(wellnessDaily)
    .where(eq(wellnessDaily.athleteId, athleteId))
    .orderBy(desc(wellnessDaily.date))
    .limit(1);

  // Yesterday's sessions
  const yesterdaySessions = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.athleteId, athleteId),
        gte(sessions.startedAt, yesterday),
        lte(sessions.startedAt, now)
      )
    )
    .orderBy(desc(sessions.startedAt));

  // Today's planned sessions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayPlanned = await db
    .select()
    .from(plannedSessions)
    .where(
      and(
        eq(plannedSessions.athleteId, athleteId),
        gte(plannedSessions.scheduledDate, today),
        lte(plannedSessions.scheduledDate, tomorrow)
      )
    );

  // Latest PMC (fitness/fatigue)
  const [latestPmc] = await db
    .select()
    .from(athletePmc)
    .where(eq(athletePmc.athleteId, athleteId))
    .orderBy(desc(athletePmc.date))
    .limit(1);

  // Build context message
  const contextParts: string[] = [];

  if (latestWellness) {
    contextParts.push(`Seneste wellness (${latestWellness.date.toISOString().split("T")[0]}):
- Soevn: ${latestWellness.sleepHours ?? "ukendt"} timer, kvalitet: ${latestWellness.sleepQuality ?? "ukendt"}/5
- Hvile-puls: ${latestWellness.restingHr ?? "ukendt"} bpm
- HRV: ${latestWellness.hrvMssd ?? "ukendt"} ms
- Traethed: ${latestWellness.fatigue ?? "ukendt"}/5
- Oemmelse: ${latestWellness.soreness ?? "ukendt"}/5
- Humør: ${latestWellness.mood ?? "ukendt"}/5
- Motivation: ${latestWellness.motivation ?? "ukendt"}/5`);
  } else {
    contextParts.push("Ingen wellness data tilgaengelig.");
  }

  if (latestPmc) {
    contextParts.push(`PMC status (${latestPmc.date.toISOString().split("T")[0]}):
- CTL (fitness): ${latestPmc.ctl.toFixed(1)}
- ATL (traethed): ${latestPmc.atl.toFixed(1)}
- TSB (form): ${latestPmc.tsb.toFixed(1)}
- Ramp rate: ${latestPmc.rampRate?.toFixed(1) ?? "ukendt"}`);
  }

  if (yesterdaySessions.length > 0) {
    const sessDesc = yesterdaySessions.map((s) =>
      `  - ${s.sport}: ${s.title}, ${s.durationSeconds}s, TSS=${s.tss ?? "?"}, HR avg=${s.avgHr ?? "?"}`
    ).join("\n");
    contextParts.push(`Gaarsdagens sessioner:\n${sessDesc}`);
  } else {
    contextParts.push("Ingen sessioner i gaar.");
  }

  if (todayPlanned.length > 0) {
    const planDesc = todayPlanned.map((p) =>
      `  - ${p.sport}: ${p.title} (${p.sessionPurpose})`
    ).join("\n");
    contextParts.push(`Dagens planlagte sessioner:\n${planDesc}`);
  } else {
    contextParts.push("Ingen planlagte sessioner i dag.");
  }

  const userMessage = contextParts.join("\n\n");

  // Enrich system prompt with coaching preferences
  const [coachPrefs] = await db
    .select()
    .from(aiCoachingPreferences)
    .where(eq(aiCoachingPreferences.athleteId, athleteId))
    .limit(1);

  let enrichedPrompt = SYSTEM_PROMPT;
  if (coachPrefs) {
    const styleMap: Record<string, string> = {
      concise: "Hold dine svar korte og praecise.",
      detailed: "Giv detaljerede forklaringer og begrundelser.",
      motivational: "Vaer opmuntrende og motiverende i din tone.",
    };
    const styleInstruction = styleMap[coachPrefs.communicationStyle] ?? "";
    const focusAreas = coachPrefs.focusAreas as string[] ?? [];
    if (styleInstruction) enrichedPrompt += `\n\nKommunikationsstil: ${styleInstruction}`;
    if (focusAreas.length > 0) enrichedPrompt += `\nFokuser saerligt paa: ${focusAreas.join(", ")}.`;
  }

  // Call LLM
  const rawResponse = await generateCompletion(enrichedPrompt, userMessage, {
    athleteId,
    requestType: "briefing",
    temperature: 0.6,
    maxTokens: 800,
  });

  // Parse JSON response
  let parsed: {
    summary: string;
    recommendations: string[];
    warnings: string[];
    focusAreas: string[];
  };

  try {
    // Try to extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found");
    }
  } catch {
    // If parsing fails, use the raw text
    parsed = {
      summary: rawResponse,
      recommendations: ["Fortsaet med planlagt traening"],
      warnings: [],
      focusAreas: ["Generel traening"],
    };
  }

  // Store in database
  const [created] = await db
    .insert(aiDailyBriefings)
    .values({
      athleteId,
      date: new Date(),
      summary: parsed.summary,
      recommendations: parsed.recommendations,
      warnings: parsed.warnings,
      focusAreas: parsed.focusAreas,
    })
    .returning();

  return {
    id: created.id,
    summary: created.summary,
    recommendations: created.recommendations as string[],
    warnings: created.warnings as string[],
    focusAreas: created.focusAreas as string[],
    generatedAt: created.generatedAt.toISOString(),
  };
}
