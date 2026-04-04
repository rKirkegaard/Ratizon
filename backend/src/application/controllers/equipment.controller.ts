import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { equipment } from "../../infrastructure/database/schema/equipment.schema.js";
import { eq, and, desc } from "drizzle-orm";

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
    if (body.notes !== undefined) updateData.notes = body.notes;

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
