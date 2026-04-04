import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import {
  aiAlerts,
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
import { generateChatCompletion } from "../../infrastructure/llm/LLMClient.js";
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

// ── POST /api/ai-coaching/:athleteId/chat ───────────────────────────────

export async function chat(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { message, conversationId, contextType, contextPage } = req.body;

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

    // Generate AI response
    const aiResponse = await generateChatCompletion(
      CHAT_SYSTEM_PROMPT,
      chronological,
      { temperature: 0.7, maxTokens: 512 }
    );

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
