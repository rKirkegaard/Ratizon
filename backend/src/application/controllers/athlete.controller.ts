import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { athletes, users, coachAthleteAssignments } from "../../infrastructure/database/schema/athlete.schema.js";
import { eq } from "drizzle-orm";

/**
 * GET /api/athletes
 * List athletes — admins see all, coaches see their assigned athletes, athletes see only themselves
 */
export async function listAthletes(req: Request, res: Response) {
  try {
    const role = req.user?.role;
    const userId = req.user?.userId as string;

    if (role === "admin") {
      // Admins see all athletes
      const rows = await db.select({
        athleteId: athletes.id,
        userId: athletes.userId,
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImageUrl: athletes.profileImageUrl,
      }).from(athletes).innerJoin(users, eq(users.id, athletes.userId));
      res.json({ data: rows });
    } else if (role === "coach") {
      // Coaches see athletes assigned to them
      const rows = await db.select({
        athleteId: athletes.id,
        userId: athletes.userId,
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        profileImageUrl: athletes.profileImageUrl,
      }).from(coachAthleteAssignments)
        .innerJoin(athletes, eq(athletes.id, coachAthleteAssignments.athleteId))
        .innerJoin(users, eq(users.id, athletes.userId))
        .where(eq(coachAthleteAssignments.coachId, userId));
      res.json({ data: rows });
    } else {
      // Athletes see only themselves
      const [athlete] = await db.select({ id: athletes.id }).from(athletes).where(eq(athletes.userId, userId)).limit(1);
      if (athlete) {
        const [row] = await db.select({
          athleteId: athletes.id,
          userId: athletes.userId,
          displayName: users.displayName,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: athletes.profileImageUrl,
        }).from(athletes).innerJoin(users, eq(users.id, athletes.userId)).where(eq(athletes.id, athlete.id)).limit(1);
        res.json({ data: row ? [row] : [] });
      } else {
        res.json({ data: [] });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

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
        cycleType: athletes.cycleType,
        profileImageUrl: athletes.profileImageUrl,
        poolUrls: athletes.poolUrls,
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
    if (body.cycleType !== undefined) updateData.cycleType = body.cycleType;
    if (body.poolUrls !== undefined) updateData.poolUrls = body.poolUrls;

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

/**
 * POST /api/athletes/:athleteId/profile-image
 * Upload profile image (expects JSON { image: "data:image/..." })
 */
export async function uploadProfileImage(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const { image } = req.body;

    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      res.status(400).json({ error: "Ugyldig billeddata — skal vaere en data:image/... URI" });
      return;
    }

    await db.update(athletes).set({ profileImageUrl: image, updatedAt: new Date() }).where(eq(athletes.id, athleteId));
    res.json({ data: { url: image } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/athletes/:athleteId/profile-image
 * Remove profile image
 */
export async function deleteProfileImage(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    await db.update(athletes).set({ profileImageUrl: null, updatedAt: new Date() }).where(eq(athletes.id, athleteId));
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
