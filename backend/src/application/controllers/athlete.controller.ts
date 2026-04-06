import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { athletes, users } from "../../infrastructure/database/schema/athlete.schema.js";
import { eq } from "drizzle-orm";

/**
 * GET /api/athletes/:athleteId/profile
 * Get athlete profile with baselines
 */
export async function getAthleteProfile(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;

    const rows = await db
      .select({
        id: athletes.id,
        userId: athletes.userId,
        displayName: users.displayName,
        email: users.email,
        dateOfBirth: athletes.dateOfBirth,
        gender: athletes.gender,
        weight: athletes.weight,
        restingHr: athletes.restingHr,
        maxHr: athletes.maxHr,
        ftp: athletes.ftp,
        lthr: athletes.lthr,
        swimCss: athletes.swimCss,
        runThresholdPace: athletes.runThresholdPace,
        height: athletes.height,
        trainingPhilosophy: athletes.trainingPhilosophy,
        weeklyVolumeMin: athletes.weeklyVolumeMin,
        weeklyVolumeMax: athletes.weeklyVolumeMax,
        createdAt: athletes.createdAt,
        updatedAt: athletes.updatedAt,
      })
      .from(athletes)
      .innerJoin(users, eq(users.id, athletes.userId))
      .where(eq(athletes.id, athleteId))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Atlet ikke fundet" });
      return;
    }

    res.json({ data: rows[0] });
  } catch (error: any) {
    console.error("Fejl ved hentning af atletprofil:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}

/**
 * PUT /api/athletes/:athleteId/profile
 * Update profile baselines (hrmax, ftp, lthr, css, weight, etc.)
 */
export async function updateAthleteProfile(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const body = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.maxHr !== undefined) updateData.maxHr = body.maxHr;
    if (body.ftp !== undefined) updateData.ftp = body.ftp;
    if (body.lthr !== undefined) updateData.lthr = body.lthr;
    if (body.swimCss !== undefined) updateData.swimCss = body.swimCss;
    if (body.restingHr !== undefined) updateData.restingHr = body.restingHr;
    if (body.weight !== undefined) updateData.weight = body.weight;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.dateOfBirth !== undefined)
      updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    if (body.runThresholdPace !== undefined) updateData.runThresholdPace = body.runThresholdPace;
    if (body.height !== undefined) updateData.height = body.height;
    if (body.trainingPhilosophy !== undefined) updateData.trainingPhilosophy = body.trainingPhilosophy;
    if (body.weeklyVolumeMin !== undefined) updateData.weeklyVolumeMin = body.weeklyVolumeMin;
    if (body.weeklyVolumeMax !== undefined) updateData.weeklyVolumeMax = body.weeklyVolumeMax;

    const [updated] = await db
      .update(athletes)
      .set(updateData)
      .where(eq(athletes.id, athleteId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Atlet ikke fundet" });
      return;
    }

    // Also update user display name / email if provided
    if (body.displayName !== undefined || body.email !== undefined) {
      const userUpdate: Record<string, unknown> = { updatedAt: new Date() };
      if (body.displayName !== undefined) userUpdate.displayName = body.displayName;
      if (body.email !== undefined) userUpdate.email = body.email;
      await db.update(users).set(userUpdate).where(eq(users.id, updated.userId));
    }

    res.json({ data: updated });
  } catch (error: any) {
    console.error("Fejl ved opdatering af atletprofil:", error);
    res.status(500).json({ error: error.message || "Intern serverfejl" });
  }
}
