import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import {
  recommendations,
  aiDailyBriefings,
  aiSessionFeedback,
  aiAlerts,
} from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { plannedSessions } from "../../infrastructure/database/schema/training.schema.js";
import { eq, and, desc, ne } from "drizzle-orm";

// ── GET /api/recommendations/:athleteId ──────────────────────────────

export async function getRecommendations(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const statusFilter = (req.query.status as string) ?? "pending";

    // 1. Dedicated recommendations
    const conditions = [eq(recommendations.athleteId, athleteId)];
    if (statusFilter !== "all") {
      conditions.push(eq(recommendations.status, statusFilter));
    }

    const recs = await db
      .select()
      .from(recommendations)
      .where(and(...conditions))
      .orderBy(desc(recommendations.createdAt))
      .limit(50);

    // 2. Also include aggregated from briefings/feedback/alerts for "pending" view
    const aggregated: any[] = [];

    if (statusFilter === "pending" || statusFilter === "all") {
      // Latest briefing recommendations
      const [briefing] = await db
        .select()
        .from(aiDailyBriefings)
        .where(eq(aiDailyBriefings.athleteId, athleteId))
        .orderBy(desc(aiDailyBriefings.generatedAt))
        .limit(1);

      if (briefing) {
        const bRecs = (briefing.recommendations as string[]) ?? [];
        bRecs.forEach((r, i) => {
          aggregated.push({
            id: `briefing-${briefing.id}-${i}`,
            source: "briefing",
            category: "training",
            priority: "medium",
            title: "Daglig anbefaling",
            description: r,
            status: "pending",
            generatedBy: "ai",
            createdAt: briefing.generatedAt.toISOString(),
          });
        });
      }

      // Unacknowledged alerts as recommendations
      const alerts = await db
        .select()
        .from(aiAlerts)
        .where(and(eq(aiAlerts.athleteId, athleteId), eq(aiAlerts.acknowledged, false)))
        .orderBy(desc(aiAlerts.createdAt))
        .limit(10);

      for (const a of alerts) {
        aggregated.push({
          id: `alert-${a.id}`,
          source: "alert",
          category: a.alertType,
          priority: a.severity === "critical" ? "critical" : a.severity === "warning" ? "high" : "medium",
          title: a.title,
          description: a.message,
          status: "pending",
          generatedBy: "system",
          createdAt: a.createdAt.toISOString(),
        });
      }
    }

    // Merge and sort
    const all = [
      ...recs.map((r) => ({
        ...r,
        source: "recommendation" as const,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        expiresAt: r.expiresAt?.toISOString() ?? null,
        acceptedAt: r.acceptedAt?.toISOString() ?? null,
        implementedAt: r.implementedAt?.toISOString() ?? null,
      })),
      ...aggregated,
    ];

    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    all.sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json({ data: all });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── POST /api/recommendations ────────────────────────────────────────

export async function createRecommendation(req: Request, res: Response) {
  try {
    const body = req.body;
    const [created] = await db
      .insert(recommendations)
      .values({
        athleteId: body.athleteId,
        category: body.category ?? "training",
        priority: body.priority ?? "medium",
        title: body.title,
        description: body.description,
        reasoning: body.reasoning ?? null,
        generatedBy: body.generatedBy ?? "coach",
        sport: body.sport ?? null,
        scheduledDate: body.scheduledDate ?? null,
        trainingType: body.trainingType ?? null,
        durationMinutes: body.durationMinutes ?? null,
        tss: body.tss ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── PUT /api/recommendations/:id ─────────────────────────────────────

export async function updateRecommendation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const body = req.body;
    const data: Record<string, unknown> = { updatedAt: new Date() };

    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.category !== undefined) data.category = body.category;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.reasoning !== undefined) data.reasoning = body.reasoning;
    if (body.sport !== undefined) data.sport = body.sport;
    if (body.scheduledDate !== undefined) data.scheduledDate = body.scheduledDate;
    if (body.trainingType !== undefined) data.trainingType = body.trainingType;
    if (body.durationMinutes !== undefined) data.durationMinutes = body.durationMinutes;
    if (body.tss !== undefined) data.tss = body.tss;

    await db.update(recommendations).set(data).where(eq(recommendations.id, id));
    res.json({ data: { message: "Anbefaling opdateret" } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── POST /api/recommendations/:id/accept ─────────────────────────────

export async function acceptRecommendation(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const [rec] = await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.id, id))
      .limit(1);

    if (!rec) {
      res.status(404).json({ error: "Anbefaling ikke fundet" });
      return;
    }

    await db
      .update(recommendations)
      .set({ status: "accepted", acceptedAt: new Date(), updatedAt: new Date() })
      .where(eq(recommendations.id, id));

    // If recommendation has scheduling info, create a planned session
    if (rec.sport && rec.scheduledDate) {
      await db.insert(plannedSessions).values({
        athleteId: rec.athleteId,
        sport: rec.sport,
        scheduledDate: new Date(rec.scheduledDate),
        sessionPurpose: rec.trainingType ?? "endurance",
        title: rec.title,
        description: rec.description,
        targetDurationSeconds: rec.durationMinutes ? rec.durationMinutes * 60 : null,
        targetTss: rec.tss ? Number(rec.tss) : null,
        aiGenerated: true,
      });
    }

    res.json({ data: { message: "Anbefaling accepteret", calendarImported: !!(rec.sport && rec.scheduledDate) } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── POST /api/recommendations/:id/reject ─────────────────────────────

export async function rejectRecommendation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await db
      .update(recommendations)
      .set({ status: "rejected", rejectionReason: reason ?? null, updatedAt: new Date() })
      .where(eq(recommendations.id, id));

    res.json({ data: { message: "Anbefaling afvist" } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── POST /api/recommendations/:id/implement ──────────────────────────

export async function implementRecommendation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    await db
      .update(recommendations)
      .set({ status: "implemented", implementedAt: new Date(), implementationNotes: notes ?? null, updatedAt: new Date() })
      .where(eq(recommendations.id, id));

    res.json({ data: { message: "Anbefaling implementeret" } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── DELETE /api/recommendations/:id ──────────────────────────────────

export async function deleteRecommendation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await db.delete(recommendations).where(eq(recommendations.id, id));
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}
