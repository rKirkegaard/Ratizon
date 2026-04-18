import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import {
  aiAlerts,
  aiCoachingPreferences,
  aiSuggestionLog,
  alertRules,
  coachNotes,
  chatConversations,
  chatMessages,
} from "../../infrastructure/database/schema/ai-coaching.schema.js";
import {
  getTodayBriefing,
  generateDailyBriefing,
} from "../use-cases/GenerateDailyBriefing.js";
import {
  getSessionFeedback,
  generateSessionFeedback,
} from "../use-cases/GenerateSessionFeedback.js";
import { generateChatCompletionFull } from "../../infrastructure/llm/LLMClient.js";
import { getEffectiveConfigWithBudget } from "../../domain/services/EffectiveLLMService.js";
import { evaluateAlerts as runAlertEngine } from "../../domain/services/AlertEngine.js";
import { getWeeklySummary, generateWeeklySummary } from "../use-cases/GenerateWeeklySummary.js";
import { getMonthlySummary, generateMonthlySummary } from "../use-cases/GenerateMonthlySummary.js";
import { plannedSessions } from "../../infrastructure/database/schema/training.schema.js";
import { eq, and, desc } from "drizzle-orm";

const CHAT_SYSTEM_PROMPT = `Du er en AI triatlon-coach i Ratizon platformen. Du svarar paa dansk.

Du hjaelper atleter med:
- Traeningsplaner og -raad
- Analyse af traeningsdata
- Restitution og wellness
- Naering og hydreering
- Mentale strategier
- Tekniske forbedringer

Vaar venlig, professionel og specifik. Hold svarene korte og handlingsorienterede.
Hvis du refererer til specifikke data, nævn det tydeligt.`;

// ── GET /api/ai-coaching/:athleteId/daily-briefing ─────────────────────

export async function getDailyBriefing(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;

    let briefing = await getTodayBriefing(athleteId);

    if (!briefing) {
      // Auto-generate if none exists
      briefing = await generateDailyBriefing(athleteId);
    }

    res.json({ data: briefing });
  } catch (error: any) {
    console.error("Fejl ved hentning af daglig briefing:", error);
    res.status(500).json({ error: { message: error.message || "Intern serverfejl" } });
  }
}

// ── POST /api/ai-coaching/:athleteId/daily-briefing/generate ───────────

export async function forceGenerateBriefing(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const briefing = await generateDailyBriefing(athleteId);
    res.json({ data: briefing });
  } catch (error: any) {
    console.error("Fejl ved generering af daglig briefing:", error);
    res.status(500).json({ error: { message: error.message || "Intern serverfejl" } });
  }
}

// ── GET /api/ai-coaching/:athleteId/session-feedback/:sessionId ────────

export async function getSessionFeedbackRoute(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const feedback = await getSessionFeedback(sessionId);

    if (!feedback) {
      res.json({ data: null });
      return;
    }

    res.json({ data: feedback });
  } catch (error: any) {
    console.error("Fejl ved hentning af session feedback:", error);
    res.status(500).json({ error: { message: error.message || "Intern serverfejl" } });
  }
}

// ── POST /api/ai-coaching/:athleteId/session-feedback/:sessionId/generate

export async function generateSessionFeedbackRoute(req: Request, res: Response) {
  try {
    const { athleteId, sessionId } = req.params;
    const feedback = await generateSessionFeedback(athleteId, sessionId);
    res.json({ data: feedback });
  } catch (error: any) {
    console.error("Fejl ved generering af session feedback:", error);
    res.status(500).json({ error: { message: error.message || "Intern serverfejl" } });
  }
}

// ── GET /api/ai-coaching/:athleteId/session-analytics/:sessionId ──────

export async function getSessionDeepAnalytics(req: Request, res: Response) {
  try {
    const { athleteId, sessionId } = req.params;
    const { calculateDeepAnalytics } = await import("../../domain/services/SessionAnalyticsService.js");
    const analytics = await calculateDeepAnalytics(Number(sessionId), athleteId as string);
    res.json({ data: analytics });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── GET /api/ai-coaching/:athleteId/alerts ──────────────────────────────

export async function getAlerts(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;

    const alerts = await db
      .select()
      .from(aiAlerts)
      .where(
        and(
          eq(aiAlerts.athleteId, athleteId),
          eq(aiAlerts.acknowledged, false)
        )
      )
      .orderBy(desc(aiAlerts.createdAt))
      .limit(20);

    res.json({
      data: alerts.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("Fejl ved hentning af alerts:", error);
    res.status(500).json({ error: { message: error.message || "Intern serverfejl" } });
  }
}

// ── PATCH /api/ai-coaching/:athleteId/alerts/:alertId/acknowledge ─────

export async function acknowledgeAlert(req: Request, res: Response) {
  try {
    const { alertId } = req.params;
    await db
      .update(aiAlerts)
      .set({ acknowledged: true })
      .where(eq(aiAlerts.id, alertId));
    res.json({ data: { message: "Alert bekraeftet" } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message || "Intern serverfejl" } });
  }
}

// ── POST /api/ai-coaching/:athleteId/chat ───────────────────────────────

export async function chat(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { message, conversationId, contextType, contextPage, sport, weeks, customContext } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: { message: "Besked er paakraevet" } });
      return;
    }

    let convId = conversationId;

    // Create new conversation if needed
    if (!convId) {
      const [newConv] = await db
        .insert(chatConversations)
        .values({
          athleteId,
          title: message.slice(0, 100),
          contextType: contextType ?? null,
          contextPage: contextPage ?? null,
        })
        .returning();
      convId = newConv.id;
    }

    // Store user message
    await db.insert(chatMessages).values({
      conversationId: convId,
      role: "user",
      content: message.trim(),
      contextType: contextType ?? null,
      contextPage: contextPage ?? null,
    });

    // Get conversation history (last 20 messages)
    const history = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, convId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(20);

    // Reverse to get chronological order
    const chronological = history.reverse().map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Check budget and get effective config
    const { config, budget } = await getEffectiveConfigWithBudget(athleteId);
    if (!budget.allowed) {
      res.status(403).json({
        error: {
          message: "Maanedlig AI-budget overskredet",
          currentCost: budget.currentCostCents,
          limit: budget.limitCents,
        },
      });
      return;
    }

    // Build athlete training data context (S4)
    const { buildAthleteContext } = await import("../../domain/services/AthleteContextBuilder.js");
    const athleteContext = await buildAthleteContext(athleteId as string, {
      sport: sport ?? "all",
      weeks: weeks ?? 2,
      customContext: customContext ?? undefined,
    });

    // Build full system prompt: base + config context + athlete data
    const basePrompt = config.systemContext
      ? `${config.systemContext}\n\n${CHAT_SYSTEM_PROMPT}`
      : CHAT_SYSTEM_PROMPT;

    const systemPrompt = `${basePrompt}\n\n--- ATLETENS DATA ---\n${athleteContext}`;

    // Generate AI response with athlete-aware provider/model
    const result = await generateChatCompletionFull(
      systemPrompt,
      chronological,
      { athleteId, requestType: "chat", temperature: 0.7, maxTokens: 1024 }
    );
    const aiResponse = result.content;

    // Store AI response
    const [storedResponse] = await db
      .insert(chatMessages)
      .values({
        conversationId: convId,
        role: "assistant",
        content: aiResponse,
      })
      .returning();

    res.json({
      data: {
        conversationId: convId,
        isMock: result.isMock,
        message: {
          id: storedResponse.id.toString(),
          role: "assistant",
          content: aiResponse,
          createdAt: storedResponse.createdAt.toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error("Fejl ved AI chat:", error);
    res.status(500).json({ error: { message: error.message || "Intern serverfejl" } });
  }
}

// ── AI Coaching Preferences ──────────────────────────────────────────

export async function getCoachingPreferences(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const [prefs] = await db
      .select()
      .from(aiCoachingPreferences)
      .where(eq(aiCoachingPreferences.athleteId, athleteId))
      .limit(1);

    res.json({
      data: prefs ?? {
        communicationStyle: "concise",
        language: "da",
        focusAreas: [],
        autoSuggestions: true,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

export async function updateCoachingPreferences(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const body = req.body;

    const [existing] = await db
      .select()
      .from(aiCoachingPreferences)
      .where(eq(aiCoachingPreferences.athleteId, athleteId))
      .limit(1);

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (body.communicationStyle !== undefined) data.communicationStyle = body.communicationStyle;
    if (body.language !== undefined) data.language = body.language;
    if (body.focusAreas !== undefined) data.focusAreas = body.focusAreas;
    if (body.autoSuggestions !== undefined) data.autoSuggestions = body.autoSuggestions;

    if (existing) {
      await db.update(aiCoachingPreferences).set(data).where(eq(aiCoachingPreferences.athleteId, athleteId));
    } else {
      await db.insert(aiCoachingPreferences).values({
        athleteId,
        communicationStyle: body.communicationStyle ?? "concise",
        language: body.language ?? "da",
        focusAreas: body.focusAreas ?? [],
        autoSuggestions: body.autoSuggestions ?? true,
      });
    }

    res.json({ data: { message: "Praeferencer opdateret" } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── Alert Rules CRUD ─────────────────────────────────────────────────

export async function getAlertRules(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const rules = await db
      .select()
      .from(alertRules)
      .where(eq(alertRules.athleteId, athleteId));

    res.json({ data: rules });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

export async function createAlertRule(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { ruleName, ruleType, thresholds, enabled } = req.body;

    const [created] = await db
      .insert(alertRules)
      .values({
        athleteId,
        ruleName: ruleName ?? "Ny regel",
        ruleType: ruleType ?? "custom",
        thresholds: thresholds ?? {},
        enabled: enabled ?? true,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

export async function updateAlertRule(req: Request, res: Response) {
  try {
    const { ruleId } = req.params;
    const body = req.body;
    const data: Record<string, unknown> = {};
    if (body.ruleName !== undefined) data.ruleName = body.ruleName;
    if (body.ruleType !== undefined) data.ruleType = body.ruleType;
    if (body.thresholds !== undefined) data.thresholds = body.thresholds;
    if (body.enabled !== undefined) data.enabled = body.enabled;

    await db.update(alertRules).set(data).where(eq(alertRules.id, ruleId));
    res.json({ data: { message: "Regel opdateret" } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

export async function deleteAlertRule(req: Request, res: Response) {
  try {
    const { ruleId } = req.params;
    await db.delete(alertRules).where(eq(alertRules.id, ruleId));
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── POST /api/ai-coaching/:athleteId/alerts/evaluate ─────────────────

export async function evaluateAlertsRoute(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const result = await runAlertEngine(athleteId);
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── Weekly AI Summary ────────────────────────────────────────────────

export async function getWeeklySummaryRoute(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const weekStr = req.query.week as string;
    if (!weekStr) { res.status(400).json({ error: "week query param paakraevet (YYYY-MM-DD)" }); return; }
    const summary = await getWeeklySummary(athleteId, new Date(weekStr));
    res.json({ data: summary });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

export async function generateWeeklySummaryRoute(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const weekStr = (req.query.week as string) ?? req.body.week;
    if (!weekStr) { res.status(400).json({ error: "week param paakraevet (YYYY-MM-DD)" }); return; }
    const summary = await generateWeeklySummary(athleteId, new Date(weekStr));
    res.json({ data: summary });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── Monthly AI Summary ───────────────────────────────────────────────

export async function getMonthlySummaryRoute(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const year = parseInt(req.query.year as string);
    const month = parseInt(req.query.month as string);
    if (!year || !month) { res.status(400).json({ error: "year og month query params paakraevet" }); return; }
    const summary = await getMonthlySummary(athleteId, year, month);
    res.json({ data: summary });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

export async function generateMonthlySummaryRoute(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const year = parseInt((req.query.year as string) ?? req.body.year);
    const month = parseInt((req.query.month as string) ?? req.body.month);
    if (!year || !month) { res.status(400).json({ error: "year og month params paakraevet" }); return; }
    const summary = await generateMonthlySummary(athleteId, year, month);
    res.json({ data: summary });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── Coach Notes CRUD ─────────────────────────────────────────────────

export async function getCoachNotes(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const sessionId = req.query.sessionId as string | undefined;
    const conditions = [eq(coachNotes.athleteId, athleteId)];
    if (sessionId) conditions.push(eq(coachNotes.sessionId, BigInt(sessionId)));

    const notes = await db
      .select()
      .from(coachNotes)
      .where(and(...conditions))
      .orderBy(desc(coachNotes.createdAt));

    res.json({
      data: notes.map((n) => ({
        ...n,
        sessionId: n.sessionId?.toString() ?? null,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

export async function createCoachNote(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { content, sessionId, visibility } = req.body;
    const coachId = req.user?.userId as string;

    if (!content) { res.status(400).json({ error: "content er paakraevet" }); return; }

    const [created] = await db
      .insert(coachNotes)
      .values({
        coachId,
        athleteId,
        sessionId: sessionId ? BigInt(sessionId) : null,
        content,
        visibility: visibility ?? "private",
      })
      .returning();

    res.status(201).json({
      data: {
        ...created,
        sessionId: created.sessionId?.toString() ?? null,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

export async function updateCoachNote(req: Request, res: Response) {
  try {
    const { noteId } = req.params;
    const { content, visibility } = req.body;
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (content !== undefined) data.content = content;
    if (visibility !== undefined) data.visibility = visibility;

    await db.update(coachNotes).set(data).where(eq(coachNotes.id, noteId));
    res.json({ data: { message: "Note opdateret" } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

export async function deleteCoachNote(req: Request, res: Response) {
  try {
    const { noteId } = req.params;
    await db.delete(coachNotes).where(eq(coachNotes.id, noteId));
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── Suggestion Log ───────────────────────────────────────────────────

export async function getSuggestions(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const suggestions = await db
      .select()
      .from(aiSuggestionLog)
      .where(eq(aiSuggestionLog.athleteId, athleteId))
      .orderBy(desc(aiSuggestionLog.createdAt))
      .limit(50);

    res.json({ data: suggestions });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

export async function logSuggestionFeedback(req: Request, res: Response) {
  try {
    const { suggestionId } = req.params;
    const { accepted, feedback } = req.body;

    const data: Record<string, unknown> = {};
    if (accepted !== undefined) data.accepted = accepted;
    if (feedback !== undefined) data.feedback = feedback;

    await db.update(aiSuggestionLog).set(data).where(eq(aiSuggestionLog.id, suggestionId));
    res.json({ data: { message: "Feedback registreret" } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── AI Training Plan Parser ─────────────────────────────────────────

const PLAN_PARSER_SYSTEM_PROMPT = `Du er en erfaren triatlon-coach med ekspertise i periodisering og individualiseret traeningsplanlaegning.

DIN ROLLE:
Du designer traeningsplaner som en rigtig coach — ikke ved at fylde skabeloner ud, men ved at TAENKE over atletens situation:
- Hvilken FASE er atleten i? (base = volumen + lav intensitet, build = stigende intensitet, peak = hoej intensitet + lav volumen, taper = reduceret)
- Hvilken TRAENINGSFILOSOFI bruger atleten? (polarized = 80% Z1 + 20% Z5, pyramidal = mest Z1 noget Z3 lidt Z5, sweet_spot = mere Z3-Z4, norwegian = lange threshold)
- Hvor mange TIMER/UGE har atleten til raadighed? Fordel realistisk.
- Hvor mange UGER TIL MAAL? (20+ uger = base fokus, 8-20 = build, 4-8 = peak, <4 = taper)
- Hvad viser atletens SENESTE TRAENING? (undgaa gentagelse, byg videre, progressiv overload)
- Har atleten SKADER eller BEGRAENSNINGER?

ZONE-DEFINITIONER (beregn praecise vaerdier ud fra atletens individuelle taerskler):

Cykel (baseret paa FTP): Z1 <55%, Z2 56-75%, Z3 Tempo 76-87%, Sweet Spot 88-93%, Z4 Threshold 94-105%, Z5 VO2max 106-120%
Loeb (baseret paa threshold pace): Z1 +1:30-2:00, Z2 +0:45-1:15, Z3 +0:15-0:30, Z4 +/-0:10, Z5 -0:30-0:45
Svoem (baseret paa CSS sek/100m): Recovery +15-20s, Endurance +5-10s, CSS +/-3s, Threshold -3-5s, VO2max -8-15s

SESSION-DESIGN BASERET PAA FASE OG FILOSOFI:
- Intensitetssessioner (sweet_spot, threshold, vo2max) SKAL have opvarmning + strukturerede intervaller + nedkoeling
- Intervallernes LAENGDE, ANTAL og PAUSE afhaenger af atletens fase og filosofi:
  * Base: faerre, laengere intervaller (2-3x15-20min) eller steady-state, lav total intensitet
  * Build: klassiske intervaller (3-5x8-12min), stigende specifitet
  * Peak: kortere, haardere (6-8x3-5min), fuld restitution, race-specifik
  * Polarized: UNDGAA tempo/sweet spot — primaert Z1 steady + Z5 korte haarde intervaller
  * Norwegian: 4x8min eller 5x6min threshold med ca. fuld pause (50-75% af arbejdstid)
  * Sweet spot filosofi: laengere intervaller i SS-zonen (3-4x15-20min), god til tidseffektiv traening
- Endurance/recovery: steady-state, INGEN intervaller
- Svoem: altid opvarmning (400-800m varieret) + struktureret hovedsaet + nedkoeling (200-400m)

TSS: Cykel ca. (sek x IF^2) / 36. Loeb/Svoem: estimer fra varighed x intensitetsfaktor.

RETURNER KUN GYLDIGT JSON. Ingen tekst foer eller efter.

session_blocks format per blok:
{ "type": "warmup|interval|steady|cooldown", "durationSeconds": N, "repeatCount": N, "restSeconds": N, "targetHrZone": 1-5, "targetPace": "M:SS", "targetPower": watt, "restPace": "M:SS eller watt", "description": "praecis med individuelle targets" }

Returner format:
{"sessions":[{"sport":"swim|bike|run|strength","scheduled_date":"YYYY-MM-DD","training_type":"...","duration_minutes":N,"tss":N,"title":"dansk titel","description":"kort oversigt","session_blocks":[...],"target_zones":{"hr":[min,max]}}]}`;

export async function parseTrainingPlan(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { text, sport, weeks, detailLevel, includeConstraints, selectedSessionIds } = req.body;

    if (!text || typeof text !== "string" || text.trim().length < 10) {
      res.status(400).json({ error: "Angiv en traeningsplan-tekst (mindst 10 tegn)" });
      return;
    }

    // Build athlete context for personalized plan generation
    const { buildAthleteContext } = await import("../../domain/services/AthleteContextBuilder.js");
    const athleteContext = await buildAthleteContext(athleteId as string, {
      sport: sport ?? "all",
      weeks: weeks ?? 4,
      includeSessions: detailLevel !== "minimal",
      includeWellness: detailLevel === "full",
      includePMC: true,
      includeGoals: true,
      selectedSessionIds: Array.isArray(selectedSessionIds) ? selectedSessionIds : undefined,
    });

    // Include constraints if requested
    let constraintsText = "";
    if (includeConstraints !== false) {
      const constraintRows = await db
        .select()
        .from((await import("../../infrastructure/database/schema/ai-coaching.schema.js")).athleteTrainingConstraints)
        .where(eq((await import("../../infrastructure/database/schema/ai-coaching.schema.js")).athleteTrainingConstraints.athleteId, athleteId as string));
      if (constraintRows.length > 0) {
        constraintsText = "\n\nATLETENS BEGRÆNSNINGER:\n" + constraintRows.map((c) => {
          return `- ${c.constraintType}: ${JSON.stringify(c.constraintData)}${c.validTo ? ` (gyldig til ${c.validTo})` : ""}`;
        }).join("\n");
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const userMessage = `Dato i dag: ${todayStr}\n\n--- ATLETENS DATA ---\n${athleteContext}${constraintsText}\n\n--- BRUGERENS PLAN-FORESPØRGSEL ---\n${text}`;

    const result = await generateChatCompletionFull(
      PLAN_PARSER_SYSTEM_PROMPT,
      [{ role: "user", content: userMessage }],
      { athleteId, requestType: "plan-parse", maxTokens: 8192 }
    );

    // Parse the LLM response as JSON — try multiple extraction strategies
    let parsed: any;
    const content = result.content;
    try {
      // Strategy 1: Extract from markdown code block
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        parsed = JSON.parse(codeBlockMatch[1].trim());
      } else {
        // Strategy 2: Find first { ... } or [ ... ] in the response
        const jsonStart = content.indexOf("{");
        const arrStart = content.indexOf("[");
        const start = jsonStart >= 0 && (arrStart < 0 || jsonStart < arrStart) ? jsonStart : arrStart;
        if (start >= 0) {
          const sub = content.slice(start);
          parsed = JSON.parse(sub);
        } else {
          // Strategy 3: Try parsing the whole thing
          parsed = JSON.parse(content.trim());
        }
      }
    } catch {
      // Return 200 with error info so frontend can show the raw response
      res.json({ data: { sessions: [], parseError: "AI returnerede ugyldigt JSON. Proev igen eller justér din beskrivelse.", raw: content, isMock: result.isMock ?? false } });
      return;
    }

    // Handle both { sessions: [...] } and bare [...] format
    const sessions = Array.isArray(parsed) ? parsed : parsed?.sessions;
    if (!Array.isArray(sessions)) {
      res.json({ data: { sessions: [], parseError: "AI-svaret indeholder ikke et sessions-array.", raw: content, isMock: result.isMock ?? false } });
      return;
    }

    res.json({ data: { sessions, isMock: result.isMock ?? false } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── Import parsed sessions to calendar ──────────────────────────────

export async function importParsedPlan(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { sessions: sessionList } = req.body;

    if (!Array.isArray(sessionList) || sessionList.length === 0) {
      res.status(400).json({ error: "sessions array er paakraevet" });
      return;
    }

    const created = [];
    for (const s of sessionList) {
      // Ensure each session_block has an id
      let blocks = s.session_blocks ?? s.main_set ?? null;
      if (Array.isArray(blocks)) {
        blocks = blocks.map((b: any) => ({
          ...b,
          id: b.id ?? crypto.randomUUID(),
        }));
      }

      const [row] = await db
        .insert(plannedSessions)
        .values({
          athleteId,
          sport: s.sport ?? "run",
          scheduledDate: new Date(s.scheduled_date),
          sessionPurpose: s.training_type ?? "endurance",
          title: s.title ?? `${s.sport} ${s.training_type}`,
          description: s.description ?? null,
          targetDurationSeconds: s.duration_minutes ? s.duration_minutes * 60 : null,
          targetTss: s.tss ?? null,
          targetZones: s.target_zones ?? null,
          sessionBlocks: blocks,
          aiGenerated: true,
        })
        .returning();
      created.push(row);
    }

    res.status(201).json({ data: { imported: created.length } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}
