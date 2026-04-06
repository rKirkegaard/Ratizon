import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { performanceTests } from "../../infrastructure/database/schema/test.schema.js";
import { athletes } from "../../infrastructure/database/schema/athlete.schema.js";
import { eq, and, desc, asc } from "drizzle-orm";

// ── GET /api/tests/:athleteId ─────────────────────────────────────────

export async function listTests(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const { testType, sport } = req.query;

    const conditions = [eq(performanceTests.athleteId, athleteId)];
    if (testType) conditions.push(eq(performanceTests.testType, testType as string));
    if (sport) conditions.push(eq(performanceTests.sport, sport as string));

    const rows = await db
      .select()
      .from(performanceTests)
      .where(and(...conditions))
      .orderBy(desc(performanceTests.testDate));

    res.json({ data: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── POST /api/tests/:athleteId ────────────────────────────────────────

export async function createTest(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const b = req.body;

    if (!b.testType || !b.testDate || !b.sport) {
      res.status(400).json({ error: "testType, testDate og sport er paakraevede" });
      return;
    }

    const [created] = await db
      .insert(performanceTests)
      .values({
        athleteId,
        testType: b.testType,
        testDate: new Date(b.testDate),
        protocol: b.protocol ?? null,
        sport: b.sport,
        resultValue: b.resultValue ?? null,
        resultUnit: b.resultUnit ?? null,
        heartRateAvg: b.heartRateAvg ?? null,
        heartRateMax: b.heartRateMax ?? null,
        lactateData: b.lactateData ?? null,
        baselineField: b.baselineField ?? null,
        baselineValue: b.baselineValue ?? null,
        notes: b.notes ?? null,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── DELETE /api/tests/:athleteId/:testId ──────────────────────────────

export async function deleteTest(req: Request, res: Response) {
  try {
    const { athleteId, testId } = req.params;
    const [deleted] = await db
      .delete(performanceTests)
      .where(and(eq(performanceTests.id, testId), eq(performanceTests.athleteId, athleteId)))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Test ikke fundet" });
      return;
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── POST /api/tests/:athleteId/:testId/apply-baseline ────────────────

export async function applyBaseline(req: Request, res: Response) {
  try {
    const { athleteId, testId } = req.params;

    const [test] = await db
      .select()
      .from(performanceTests)
      .where(and(eq(performanceTests.id, testId), eq(performanceTests.athleteId, athleteId)))
      .limit(1);

    if (!test || !test.baselineField || !test.baselineValue) {
      res.status(400).json({ error: "Test har ingen baseline-vaerdi at anvende" });
      return;
    }

    // Update athlete profile with baseline value
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      [test.baselineField]: test.baselineValue,
    };

    await db.update(athletes).set(updateData).where(eq(athletes.id, athleteId));

    // Mark baseline as applied
    await db
      .update(performanceTests)
      .set({ baselineApplied: new Date() })
      .where(eq(performanceTests.id, testId));

    res.json({
      data: {
        field: test.baselineField,
        value: test.baselineValue,
        message: `${test.baselineField} opdateret til ${test.baselineValue}`,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
