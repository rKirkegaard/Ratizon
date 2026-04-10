import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { equipment, sessionEquipment, equipmentNotificationPrefs, equipmentNotificationLog } from "../../infrastructure/database/schema/equipment.schema.js";
import { sessions } from "../../infrastructure/database/schema/training.schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * GET /api/equipment/:athleteId
 * List all equipment for an athlete
 */
export async function listEquipment(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;

    const rows = await db
      .select()
      .from(equipment)
      .where(eq(equipment.athleteId, athleteId))
      .orderBy(desc(equipment.createdAt));

    res.json({ data: rows });
  } catch (error: any) {
    console.error("Fejl ved hentning af udstyr:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * POST /api/equipment/:athleteId
 * Create new equipment
 */
export async function createEquipment(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const body = req.body;

    if (!body.name || !body.equipmentType) {
      res.status(400).json({ error: "Paakraevede felter: name, equipmentType" });
      return;
    }

    // Clear existing default for this sport before setting new one
    if (body.isDefaultFor) {
      await db.update(equipment)
        .set({ isDefaultFor: null })
        .where(and(eq(equipment.athleteId, athleteId), eq(equipment.isDefaultFor, body.isDefaultFor)));
    }

    const [created] = await db
      .insert(equipment)
      .values({
        athleteId,
        name: body.name,
        equipmentType: body.equipmentType,
        brand: body.brand ?? null,
        model: body.model ?? null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        maxDistanceKm: body.maxDistanceKm ?? null,
        maxDurationHours: body.maxDurationHours ?? null,
        isDefaultFor: body.isDefaultFor ?? null,
        initialKm: body.initialKm ?? 0,
        notes: body.notes ?? null,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (error: any) {
    console.error("Fejl ved oprettelse af udstyr:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * PUT /api/equipment/:athleteId/:id
 * Update equipment
 */
export async function updateEquipment(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const id = req.params.id as string;
    const body = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.equipmentType !== undefined) updateData.equipmentType = body.equipmentType;
    if (body.brand !== undefined) updateData.brand = body.brand;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.purchaseDate !== undefined)
      updateData.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
    if (body.maxDistanceKm !== undefined) updateData.maxDistanceKm = body.maxDistanceKm;
    if (body.maxDurationHours !== undefined) updateData.maxDurationHours = body.maxDurationHours;
    if (body.currentDistanceKm !== undefined) updateData.currentDistanceKm = body.currentDistanceKm;
    if (body.currentDurationHours !== undefined) updateData.currentDurationHours = body.currentDurationHours;
    if (body.sessionCount !== undefined) updateData.sessionCount = body.sessionCount;
    if (body.retired !== undefined) updateData.retired = body.retired;
    if (body.isDefaultFor !== undefined) updateData.isDefaultFor = body.isDefaultFor;
    if (body.initialKm !== undefined) updateData.initialKm = body.initialKm;
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Clear existing default for this sport before setting new one
    if (body.isDefaultFor) {
      await db.update(equipment)
        .set({ isDefaultFor: null })
        .where(and(eq(equipment.athleteId, athleteId), eq(equipment.isDefaultFor, body.isDefaultFor)));
    }

    const [updated] = await db
      .update(equipment)
      .set(updateData)
      .where(and(eq(equipment.id, id), eq(equipment.athleteId, athleteId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Udstyr ikke fundet" });
      return;
    }

    res.json({ data: updated });
  } catch (error: any) {
    console.error("Fejl ved opdatering af udstyr:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * DELETE /api/equipment/:athleteId/:id
 * Delete equipment
 */
export async function deleteEquipment(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const id = req.params.id as string;

    // Check for existing session links — prevent deletion if history exists
    const [linkCount] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(sessionEquipment)
      .where(eq(sessionEquipment.equipmentId, id));

    if (linkCount && linkCount.count > 0) {
      res.status(409).json({ error: "Udstyr har session-historik og kan ikke slettes. Brug arkivering i stedet." });
      return;
    }

    const [deleted] = await db
      .delete(equipment)
      .where(and(eq(equipment.id, id), eq(equipment.athleteId, athleteId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Udstyr ikke fundet" });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    console.error("Fejl ved sletning af udstyr:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

// ── Session Equipment Endpoints ───────────────────────────────────────

/**
 * GET /api/equipment/session/:sessionId
 * Get all equipment linked to a session
 */
export async function getSessionEquipment(req: Request, res: Response) {
  try {
    const sessionId = req.params.sessionId as string;
    const rows = await db.select({
      id: sessionEquipment.id,
      sessionId: sessionEquipment.sessionId,
      equipmentId: sessionEquipment.equipmentId,
      distanceKm: sessionEquipment.distanceKm,
      durationHours: sessionEquipment.durationHours,
      segmentType: sessionEquipment.segmentType,
      lapIndices: sessionEquipment.lapIndices,
      segmentMin: sessionEquipment.segmentMin,
      notes: sessionEquipment.notes,
      equipmentName: equipment.name,
      equipmentType: equipment.equipmentType,
      maxDistanceKm: equipment.maxDistanceKm,
      currentDistanceKm: equipment.currentDistanceKm,
    }).from(sessionEquipment)
      .innerJoin(equipment, eq(equipment.id, sessionEquipment.equipmentId))
      .where(eq(sessionEquipment.sessionId, BigInt(sessionId)));

    res.json({ data: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/equipment/session/:sessionId
 * Link equipment to a session
 */
export async function addSessionEquipment(req: Request, res: Response) {
  try {
    const sessionId = req.params.sessionId as string;
    const { equipmentId, segmentType, distanceKm, segmentMin, lapIndices, notes } = req.body;
    if (!equipmentId) { res.status(400).json({ error: "equipmentId er paakraevet" }); return; }

    const [created] = await db.insert(sessionEquipment).values({
      sessionId: BigInt(sessionId),
      equipmentId,
      segmentType: segmentType ?? "full",
      distanceKm: distanceKm ?? null,
      durationHours: segmentMin ? segmentMin / 60 : null,
      segmentMin: segmentMin ?? null,
      lapIndices: lapIndices ?? null,
      notes: notes ?? null,
    }).returning();

    res.status(201).json({ data: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * PUT /api/equipment/session/:sessionId/bulk
 * Replace all equipment links for a session
 */
export async function bulkSaveSessionEquipment(req: Request, res: Response) {
  try {
    const sessionId = req.params.sessionId as string;
    const { links } = req.body;
    if (!Array.isArray(links)) { res.status(400).json({ error: "links array er paakraevet" }); return; }

    // Delete all existing links
    await db.delete(sessionEquipment).where(eq(sessionEquipment.sessionId, BigInt(sessionId)));

    // Insert new links
    const created = [];
    for (const link of links) {
      const [row] = await db.insert(sessionEquipment).values({
        sessionId: BigInt(sessionId),
        equipmentId: link.equipment_id ?? link.equipmentId,
        segmentType: link.segment_type ?? link.segmentType ?? "full",
        distanceKm: link.segment_km ?? link.distanceKm ?? null,
        durationHours: link.segment_min ? link.segment_min / 60 : null,
        segmentMin: link.segment_min ?? link.segmentMin ?? null,
        lapIndices: link.lap_indices ?? link.lapIndices ?? null,
        notes: link.notes ?? null,
      }).returning();
      created.push(row);
    }

    res.json({ data: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/equipment/session-link/:linkId
 * Remove a single equipment link
 */
export async function removeSessionEquipmentLink(req: Request, res: Response) {
  try {
    const linkId = req.params.linkId as string;
    const [deleted] = await db.delete(sessionEquipment).where(eq(sessionEquipment.id, linkId)).returning();
    if (!deleted) { res.status(404).json({ error: "Link ikke fundet" }); return; }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── Archive / Restore ─────────────────────────────────────────────────

export async function archiveEquipment(req: Request, res: Response) {
  try {
    const { athleteId, id } = req.params as any;
    const [updated] = await db.update(equipment)
      .set({ retired: true, isDefaultFor: null, updatedAt: new Date() })
      .where(and(eq(equipment.id, id), eq(equipment.athleteId, athleteId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Udstyr ikke fundet" }); return; }
    res.json({ data: updated });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
}

export async function restoreEquipment(req: Request, res: Response) {
  try {
    const { athleteId, id } = req.params as any;
    const [updated] = await db.update(equipment)
      .set({ retired: false, updatedAt: new Date() })
      .where(and(eq(equipment.id, id), eq(equipment.athleteId, athleteId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Udstyr ikke fundet" }); return; }
    res.json({ data: updated });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
}

// ── Equipment Stats ───────────────────────────────────────────────────

export async function getEquipmentStats(req: Request, res: Response) {
  try {
    const { athleteId, id } = req.params as any;
    const [item] = await db.select().from(equipment).where(and(eq(equipment.id, id), eq(equipment.athleteId, athleteId))).limit(1);
    if (!item) { res.status(404).json({ error: "Udstyr ikke fundet" }); return; }

    const [agg] = await db.select({
      totalKm: sql<number>`COALESCE(SUM(${sessionEquipment.distanceKm}), 0)`,
      totalHours: sql<number>`COALESCE(SUM(${sessionEquipment.durationHours}), 0)`,
      sessionCount: sql<number>`COUNT(DISTINCT ${sessionEquipment.sessionId})`,
    }).from(sessionEquipment).where(eq(sessionEquipment.equipmentId, id));

    const lastUsedRows = await db.select({ startedAt: sessions.startedAt })
      .from(sessionEquipment)
      .innerJoin(sessions, sql`${sessions.id} = ${sessionEquipment.sessionId}`)
      .where(eq(sessionEquipment.equipmentId, id))
      .orderBy(desc(sessions.startedAt))
      .limit(1);

    // Rolling 4-week usage
    const [rolling] = await db.select({
      kmLast4w: sql<number>`COALESCE(SUM(${sessionEquipment.distanceKm}), 0)`,
      hoursLast4w: sql<number>`COALESCE(SUM(${sessionEquipment.durationHours}), 0)`,
    }).from(sessionEquipment)
      .innerJoin(sessions, sql`${sessions.id} = ${sessionEquipment.sessionId}`)
      .where(and(eq(sessionEquipment.equipmentId, id), sql`${sessions.startedAt} >= NOW() - INTERVAL '28 days'`));

    const avgKmPerWeek = (rolling?.kmLast4w ?? 0) / 4;
    const avgHoursPerWeek = (rolling?.hoursLast4w ?? 0) / 4;

    const totalKm = (item.initialKm ?? 0) + (agg?.totalKm ?? 0);
    const totalHours = agg?.totalHours ?? 0;

    // Estimate remaining weeks
    let remainingEstimate: string | null = null;
    if (item.maxDistanceKm && avgKmPerWeek > 0) {
      const remainKm = item.maxDistanceKm - totalKm;
      if (remainKm > 0) remainingEstimate = `~${Math.round(remainKm / avgKmPerWeek)} uger`;
      else remainingEstimate = "Overskredet";
    } else if (item.maxDurationHours && avgHoursPerWeek > 0) {
      const remainH = item.maxDurationHours - totalHours;
      if (remainH > 0) remainingEstimate = `~${Math.round(remainH / avgHoursPerWeek)} uger`;
      else remainingEstimate = "Overskredet";
    }

    res.json({
      data: {
        ...item,
        totalKm,
        totalHours,
        sessionCount: agg?.sessionCount ?? 0,
        lastUsedAt: lastUsedRows[0]?.startedAt ?? null,
        avgKmPerWeek: Math.round(avgKmPerWeek * 10) / 10,
        avgHoursPerWeek: Math.round(avgHoursPerWeek * 10) / 10,
        remainingEstimate,
      },
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
}

// ── Monthly Usage ─────────────────────────────────────────────────────

export async function getEquipmentMonthlyUsage(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const rows = await db.select({
      month: sql<string>`TO_CHAR(${sessions.startedAt}, 'YYYY-MM')`,
      distanceKm: sql<number>`COALESCE(SUM(${sessionEquipment.distanceKm}), 0)`,
      durationHours: sql<number>`COALESCE(SUM(${sessionEquipment.durationHours}), 0)`,
      sessionCount: sql<number>`COUNT(*)`,
    }).from(sessionEquipment)
      .innerJoin(sessions, sql`${sessions.id} = ${sessionEquipment.sessionId}`)
      .where(eq(sessionEquipment.equipmentId, id))
      .groupBy(sql`TO_CHAR(${sessions.startedAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${sessions.startedAt}, 'YYYY-MM')`);

    res.json({ data: rows });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
}

// ── Sessions per Equipment (paginated) ────────────────────────────────

export async function getEquipmentSessions(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const rows = await db.select({
      sessionId: sessionEquipment.sessionId,
      sport: sessions.sport,
      title: sessions.title,
      startedAt: sessions.startedAt,
      distanceMeters: sessions.distanceMeters,
      durationSeconds: sessions.durationSeconds,
      segmentType: sessionEquipment.segmentType,
      segmentKm: sessionEquipment.distanceKm,
      lapIndices: sessionEquipment.lapIndices,
    }).from(sessionEquipment)
      .innerJoin(sessions, sql`${sessions.id} = ${sessionEquipment.sessionId}`)
      .where(eq(sessionEquipment.equipmentId, id))
      .orderBy(desc(sessions.startedAt))
      .limit(limit)
      .offset(offset);

    const [countRow] = await db.select({ total: sql<number>`COUNT(*)` })
      .from(sessionEquipment)
      .where(eq(sessionEquipment.equipmentId, id));

    res.json({ data: rows, total: countRow?.total ?? 0, page, limit });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
}

// ── Notification Preferences ──────────────────────────────────────────

export async function getNotificationPrefs(req: Request, res: Response) {
  try {
    const { athleteId, id } = req.params as any;
    const [prefs] = await db.select().from(equipmentNotificationPrefs)
      .where(and(eq(equipmentNotificationPrefs.athleteId, athleteId), eq(equipmentNotificationPrefs.equipmentId, id)))
      .limit(1);
    res.json({ data: prefs ?? { distanceThresholdKm: null, durationThresholdHours: null, enabled: true } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
}

export async function upsertNotificationPrefs(req: Request, res: Response) {
  try {
    const { athleteId, id } = req.params as any;
    const { distanceThresholdKm, durationThresholdHours, enabled } = req.body;
    const [existing] = await db.select({ id: equipmentNotificationPrefs.id })
      .from(equipmentNotificationPrefs)
      .where(and(eq(equipmentNotificationPrefs.athleteId, athleteId), eq(equipmentNotificationPrefs.equipmentId, id)))
      .limit(1);
    if (existing) {
      await db.update(equipmentNotificationPrefs).set({
        distanceThresholdKm: distanceThresholdKm ?? null,
        durationThresholdHours: durationThresholdHours ?? null,
        enabled: enabled ?? true,
      }).where(eq(equipmentNotificationPrefs.id, existing.id));
    } else {
      await db.insert(equipmentNotificationPrefs).values({
        athleteId, equipmentId: id,
        distanceThresholdKm: distanceThresholdKm ?? null,
        durationThresholdHours: durationThresholdHours ?? null,
        enabled: enabled ?? true,
      });
    }
    res.json({ data: { success: true } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
}

// ── Lifespan Check (Background/Cron) ──────────────────────────────────

export async function checkEquipmentLifespan(_req: Request, res: Response) {
  try {
    // Get all active equipment with retirement limits
    const allEquip = await db.select().from(equipment)
      .where(eq(equipment.retired, false));

    const thresholds = [75, 90, 100];
    let notificationsCreated = 0;

    for (const item of allEquip) {
      if (!item.maxDistanceKm && !item.maxDurationHours) continue;

      // Get current usage
      const [agg] = await db.select({
        totalKm: sql<number>`COALESCE(SUM(${sessionEquipment.distanceKm}), 0)`,
        totalHours: sql<number>`COALESCE(SUM(${sessionEquipment.durationHours}), 0)`,
      }).from(sessionEquipment).where(eq(sessionEquipment.equipmentId, item.id));

      const totalKm = (item.initialKm ?? 0) + (agg?.totalKm ?? 0);
      const totalHours = agg?.totalHours ?? 0;

      let pct: number | null = null;
      if (item.maxDistanceKm && item.maxDistanceKm > 0) pct = (totalKm / item.maxDistanceKm) * 100;
      else if (item.maxDurationHours && item.maxDurationHours > 0) pct = (totalHours / item.maxDurationHours) * 100;
      if (pct === null) continue;

      for (const threshold of thresholds) {
        if (pct >= threshold) {
          // Check if already notified for this threshold
          const [existing] = await db.select({ id: equipmentNotificationLog.id })
            .from(equipmentNotificationLog)
            .where(and(eq(equipmentNotificationLog.equipmentId, item.id), eq(equipmentNotificationLog.thresholdPct, threshold)))
            .limit(1);

          if (!existing) {
            await db.insert(equipmentNotificationLog).values({
              equipmentId: item.id,
              thresholdPct: threshold,
            }).catch(() => { /* ignore duplicate */ });
            notificationsCreated++;
          }
        }
      }
    }

    res.json({ data: { checked: allEquip.length, notificationsCreated } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
}
