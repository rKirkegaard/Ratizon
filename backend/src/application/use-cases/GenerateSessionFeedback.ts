import { db } from "../../infrastructure/database/connection.js";
import { aiSessionFeedback } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { sessions } from "../../infrastructure/database/schema/training.schema.js";
import { sessionAnalytics } from "../../infrastructure/database/schema/analytics.schema.js";
import { generateCompletion } from "../../infrastructure/llm/LLMClient.js";
import { aiCoachingPreferences } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { eq, and, desc } from "drizzle-orm";

const SYSTEM_PROMPT = `Du er en ekspert triatlon-coach AI for Ratizon platformen. Du giver feedback paa traeningssessioner paa dansk.

Din feedback skal indeholde:
1. En overordnet vurdering af sessionen (2-3 saetninger)
2. Styrker i sessionen (liste, 2-4 punkter)
3. Forbedringspunkter (liste, 1-3 punkter)
4. Forslag til naeste session (1 saetning, kan vaere null)

Svar i JSON format:
{
  "overallAssessment": "Overordnet vurdering...",
  "strengths": ["Styrke 1", "Styrke 2"],
  "improvements": ["Forbedring 1"],
  "nextSessionSuggestion": "Forslag til naeste session..."
}

Vaar specifik, konstruktiv og datadrevet.`;

export interface SessionFeedbackResult {
  id: string;
  overallAssessment: string;
  strengths: string[];
  improvements: string[];
  nextSessionSuggestion: string | null;
  generatedAt: string;
}

/**
 * Get existing feedback for a session.
 */
export async function getSessionFeedback(sessionId: string): Promise<SessionFeedbackResult | null> {
  const [feedback] = await db
    .select()
    .from(aiSessionFeedback)
    .where(eq(aiSessionFeedback.sessionId, BigInt(sessionId)))
    .orderBy(desc(aiSessionFeedback.generatedAt))
    .limit(1);

  if (!feedback) return null;

  return {
    id: feedback.id,
    overallAssessment: feedback.overallAssessment,
    strengths: feedback.strengths as string[],
    improvements: feedback.improvements as string[],
    nextSessionSuggestion: feedback.nextSessionSuggestion,
    generatedAt: feedback.generatedAt.toISOString(),
  };
}

/**
 * Generate AI feedback for a training session.
 */
export async function generateSessionFeedback(
  athleteId: string,
  sessionId: string
): Promise<SessionFeedbackResult> {
  // Get session data
  const [sessionRow] = await db
    .select({
      session: sessions,
      analytics: sessionAnalytics,
    })
    .from(sessions)
    .leftJoin(sessionAnalytics, eq(sessions.id, sessionAnalytics.sessionId))
    .where(
      and(
        eq(sessions.athleteId, athleteId),
        eq(sessions.id, BigInt(sessionId))
      )
    )
    .limit(1);

  if (!sessionRow) {
    throw new Error("Session ikke fundet");
  }

  const s = sessionRow.session;
  const a = sessionRow.analytics;

  // Get recent similar sessions for comparison
  const recentSimilar = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.athleteId, athleteId),
        eq(sessions.sport, s.sport)
      )
    )
    .orderBy(desc(sessions.startedAt))
    .limit(5);

  // Build context
  const contextParts: string[] = [];

  contextParts.push(`Session: ${s.title}
- Sport: ${s.sport}
- Type: ${s.sessionType}
- Varighed: ${s.durationSeconds} sekunder (${Math.round(s.durationSeconds / 60)} min)
- Distance: ${s.distanceMeters ? `${s.distanceMeters}m` : "N/A"}
- Gns. puls: ${s.avgHr ?? "N/A"} bpm
- Max puls: ${s.maxHr ?? "N/A"} bpm
- Gns. power: ${s.avgPower ?? "N/A"} W
- Gns. pace: ${s.avgPace ?? "N/A"}
- Gns. kadence: ${s.avgCadence ?? "N/A"} rpm
- Hoejdemeter: ${s.elevationGain ?? "N/A"} m
- TSS: ${s.tss ?? "N/A"}
- RPE: ${s.rpe ?? "N/A"}`);

  if (a) {
    contextParts.push(`Analyse:
- Efficiency Factor: ${a.efficiencyFactor ?? "N/A"}
- Decoupling: ${a.decoupling ?? "N/A"}%
- Intensity Factor: ${a.intensityFactor ?? "N/A"}
- Variability Index: ${a.variabilityIndex ?? "N/A"}
- Zone fordeling: Z1=${a.zone1Seconds}s, Z2=${a.zone2Seconds}s, Z3=${a.zone3Seconds}s, Z4=${a.zone4Seconds}s, Z5=${a.zone5Seconds}s
- TRIMP: ${a.trimp ?? "N/A"}
- HRSS: ${a.hrss ?? "N/A"}`);
  }

  if (recentSimilar.length > 1) {
    const comparisons = recentSimilar
      .filter((rs) => rs.id.toString() !== sessionId)
      .slice(0, 3)
      .map(
        (rs) =>
          `  - ${rs.startedAt.toISOString().split("T")[0]}: ${rs.title}, ${rs.durationSeconds}s, HR=${rs.avgHr ?? "?"}, TSS=${rs.tss ?? "?"}`
      )
      .join("\n");
    if (comparisons) {
      contextParts.push(`Lignende sessioner (seneste 3):\n${comparisons}`);
    }
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
    if (styleInstruction) enrichedPrompt += `\n\nKommunikationsstil: ${styleInstruction}`;
  }

  // Call LLM
  const rawResponse = await generateCompletion(enrichedPrompt, userMessage, {
    athleteId,
    requestType: "feedback",
    temperature: 0.6,
    maxTokens: 600,
  });

  // Parse response
  let parsed: {
    overallAssessment: string;
    strengths: string[];
    improvements: string[];
    nextSessionSuggestion: string | null;
  };

  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found");
    }
  } catch {
    parsed = {
      overallAssessment: rawResponse,
      strengths: ["Sessionen blev gennemfoert"],
      improvements: ["Mere data noevendig for specifik feedback"],
      nextSessionSuggestion: null,
    };
  }

  // Store in database
  const [created] = await db
    .insert(aiSessionFeedback)
    .values({
      sessionId: BigInt(sessionId),
      overallAssessment: parsed.overallAssessment,
      strengths: parsed.strengths,
      improvements: parsed.improvements,
      nextSessionSuggestion: parsed.nextSessionSuggestion,
    })
    .returning();

  return {
    id: created.id,
    overallAssessment: created.overallAssessment,
    strengths: created.strengths as string[],
    improvements: created.improvements as string[],
    nextSessionSuggestion: created.nextSessionSuggestion,
    generatedAt: created.generatedAt.toISOString(),
  };
}
