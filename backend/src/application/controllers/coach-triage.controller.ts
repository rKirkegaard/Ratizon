import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { athletes, users, coachAthleteAssignments } from "../../infrastructure/database/schema/athlete.schema.js";
import { sessions } from "../../infrastructure/database/schema/training.schema.js";
import { athletePmc } from "../../infrastructure/database/schema/analytics.schema.js";
import { aiAlerts } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { eq, and, desc, gte, count } from "drizzle-orm";

/**
 * GET /api/coach/triage
 * Multi-athlete triage dashboard: status, alerts, last activity for each assigned athlete.
 */
export async function getCoachTriage(req: Request, res: Response) {
  try {
    const coachId = req.user?.userId as string;

    // Get assigned athletes (join with users for display name)
    const assignments: Array<{ athleteId: string; name: string; sport: string | null }> = [];

    const assigned = await db
      .select({
        athleteId: coachAthleteAssignments.athleteId,
        name: users.displayName,
      })
      .from(coachAthleteAssignments)
      .innerJoin(athletes, eq(athletes.id, coachAthleteAssignments.athleteId))
      .innerJoin(users, eq(users.id, athletes.userId))
      .where(and(eq(coachAthleteAssignments.coachId, coachId), eq(coachAthleteAssignments.status, "active")));

    for (const a of assigned) {
      assignments.push({ athleteId: a.athleteId, name: a.name, sport: null });
    }

    if (assignments.length === 0) {
      // If no assignments, show all athletes (for admin/single-user setups)
      const all = await db
        .select({ id: athletes.id, name: users.displayName })
        .from(athletes)
        .innerJoin(users, eq(users.id, athletes.userId))
        .limit(20);

      if (all.length === 0) {
        res.json({ data: [] });
        return;
      }

      for (const a of all) {
        assignments.push({ athleteId: a.id, name: a.name, sport: null });
      }
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const triageCards = await Promise.all(
      assignments.map(async (a) => {
        // Latest PMC
        const [pmc] = await db
          .select({ ctl: athletePmc.ctl, atl: athletePmc.atl, tsb: athletePmc.tsb, date: athletePmc.date })
          .from(athletePmc)
          .where(and(eq(athletePmc.athleteId, a.athleteId), eq(athletePmc.sport, "all")))
          .orderBy(desc(athletePmc.date))
          .limit(1);

        // Active (unacknowledged) alerts
        const [alertCount] = await db
          .select({ count: count() })
          .from(aiAlerts)
          .where(and(eq(aiAlerts.athleteId, a.athleteId), eq(aiAlerts.acknowledged, false)));

        // Critical alerts
        const [criticalCount] = await db
          .select({ count: count() })
          .from(aiAlerts)
          .where(and(eq(aiAlerts.athleteId, a.athleteId), eq(aiAlerts.acknowledged, false), eq(aiAlerts.severity, "critical")));

        // Last session
        const [lastSession] = await db
          .select({ startedAt: sessions.startedAt, sport: sessions.sport, title: sessions.title })
          .from(sessions)
          .where(eq(sessions.athleteId, a.athleteId))
          .orderBy(desc(sessions.startedAt))
          .limit(1);

        // Session count last 7 days
        const [recentCount] = await db
          .select({ count: count() })
          .from(sessions)
          .where(and(eq(sessions.athleteId, a.athleteId), gte(sessions.startedAt, sevenDaysAgo)));

        // Days since last session
        const daysSinceLastSession = lastSession
          ? Math.floor((Date.now() - new Date(lastSession.startedAt).getTime()) / (86400 * 1000))
          : null;

        // Determine priority
        let priority: "critical" | "warning" | "ok" = "ok";
        if (Number(criticalCount?.count ?? 0) > 0) priority = "critical";
        else if (Number(alertCount?.count ?? 0) > 0 || (daysSinceLastSession != null && daysSinceLastSession >= 5)) priority = "warning";

        return {
          athleteId: a.athleteId,
          name: a.name,
          sport: a.sport,
          ctl: pmc ? Math.round(pmc.ctl * 10) / 10 : null,
          atl: pmc ? Math.round(pmc.atl * 10) / 10 : null,
          tsb: pmc ? Math.round(pmc.tsb * 10) / 10 : null,
          activeAlerts: Number(alertCount?.count ?? 0),
          criticalAlerts: Number(criticalCount?.count ?? 0),
          lastSession: lastSession ? { date: lastSession.startedAt.toISOString(), sport: lastSession.sport, title: lastSession.title } : null,
          daysSinceLastSession,
          sessionsLast7Days: Number(recentCount?.count ?? 0),
          priority,
        };
      })
    );

    // Sort: critical first, then warning, then ok
    const priorityOrder = { critical: 0, warning: 1, ok: 2 };
    triageCards.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    res.json({ data: triageCards });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

/**
 * POST /api/coach/draft-message/:athleteId
 * Generate an AI communication draft for an athlete.
 */
export async function draftAthleteMessage(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const { messageType, context } = req.body;

    // Lazy import to avoid circular deps
    const { generateChatCompletionFull } = await import("../../infrastructure/llm/LLMClient.js");

    const typePrompts: Record<string, string> = {
      weekly_checkin: "Skriv en venlig ugentlig check-in besked til atleten. Referer til deres seneste traening og form.",
      pre_race: "Skriv en motiverende pre-race besked. Fokuser paa selvtillid, strategi og at holde sig rolig.",
      post_session: "Skriv en kort feedback-besked efter en traening. Vaer specifik om praestationen.",
      compliance_nudge: "Skriv en venlig paamindelse om at holde sig til traeningsplanen. Vaer positiv, ikke konfronterende.",
      milestone: "Skriv en lykoenkning for en traeningsmilepael. Vaer entusiastisk og specifik.",
    };

    const typeLabel = typePrompts[messageType] ?? typePrompts.weekly_checkin;

    const systemPrompt = `Du er en professionel triatlon-coach. Skriv en kort, personlig besked til din atlet.
Brug dansk. Hold det kort (max 3-4 saetninger). Vaer venlig og professionel.
${typeLabel}
${context ? `Ekstra kontekst: ${context}` : ""}`;

    const result = await generateChatCompletionFull(
      systemPrompt,
      [{ role: "user", content: `Generer en ${messageType ?? "weekly_checkin"} besked til atleten.` }],
      { athleteId, requestType: "draft-message" }
    );

    res.json({
      data: {
        draft: result.content,
        messageType: messageType ?? "weekly_checkin",
        isMock: result.isMock ?? false,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}
