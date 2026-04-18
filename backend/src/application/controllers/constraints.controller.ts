import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { athleteTrainingConstraints } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { eq, and, desc } from "drizzle-orm";

// ── GET /api/ai-coaching/:athleteId/constraints ──────────────────────

export async function getConstraints(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const rows = await db
      .select()
      .from(athleteTrainingConstraints)
      .where(eq(athleteTrainingConstraints.athleteId, athleteId))
      .orderBy(desc(athleteTrainingConstraints.createdAt));

    res.json({ data: rows });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── POST /api/ai-coaching/:athleteId/constraints ─────────────────────

export async function createConstraint(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { constraintType, constraintData, validFrom, validTo } = req.body;

    const [created] = await db
      .insert(athleteTrainingConstraints)
      .values({
        athleteId,
        constraintType,
        constraintData: constraintData ?? {},
        validFrom: validFrom ?? new Date().toISOString().slice(0, 10),
        validTo: validTo ?? null,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}

// ── DELETE /api/ai-coaching/:athleteId/constraints/:id ───────────────

export async function deleteConstraint(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await db.delete(athleteTrainingConstraints).where(eq(athleteTrainingConstraints.id, id));
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
}
