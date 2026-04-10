import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "../../infrastructure/database/connection.js";
import { users, athletes, coachAthleteAssignments } from "../../infrastructure/database/schema/athlete.schema.js";
import { eq, and } from "drizzle-orm";

// ── GET /api/admin/users ──────────────────────────────────────────────

export async function listUsers(_req: Request, res: Response) {
  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    }).from(users).orderBy(users.role, users.email);

    // Enrich with athlete_id for athletes
    const enriched = await Promise.all(allUsers.map(async (u) => {
      let athleteId: string | null = null;
      if (u.role === "athlete") {
        const [athlete] = await db.select({ id: athletes.id }).from(athletes).where(eq(athletes.userId, u.id)).limit(1);
        athleteId = athlete?.id ?? null;
      }
      return { ...u, athleteId };
    }));

    res.json({ data: enriched });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── POST /api/admin/users ─────────────────────────────────────────────

export async function createUser(req: Request, res: Response) {
  try {
    const { email, password, firstName, lastName, displayName, role } = req.body;
    const name = displayName || `${firstName || ""} ${lastName || ""}`.trim();
    if (!email || !password || !name) {
      res.status(400).json({ error: "email, password og navn er paakraevede" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password skal vaere mindst 8 tegn" });
      return;
    }

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing) {
      res.status(409).json({ error: "En bruger med denne email eksisterer allerede" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [created] = await db.insert(users).values({
      email: email.toLowerCase().trim(),
      passwordHash,
      displayName: name,
      firstName: firstName || null,
      lastName: lastName || null,
      role: role || "athlete",
    }).returning();

    // Create athlete profile if role is athlete
    if (created.role === "athlete") {
      await db.insert(athletes).values({ userId: created.id });
    }

    res.status(201).json({
      data: {
        id: created.id,
        email: created.email,
        displayName: created.displayName,
        firstName: created.firstName,
        lastName: created.lastName,
        role: created.role,
        isActive: created.isActive,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── PUT /api/admin/users/:id ──────────────────────────────────────────

export async function updateUser(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { firstName, lastName, displayName, role, isActive } = req.body;

    // Safety: prevent admin from changing own role or deactivating self
    if (req.user?.userId === id) {
      if (role !== undefined && role !== "admin") {
        res.status(400).json({ error: "Du kan ikke aendre din egen rolle" });
        return;
      }
      if (isActive === false) {
        res.status(400).json({ error: "Du kan ikke deaktivere din egen konto" });
        return;
      }
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (displayName !== undefined) updates.displayName = displayName;
    if (firstName !== undefined || lastName !== undefined) {
      // Auto-update displayName from first+last if both provided
      const fName = firstName ?? "";
      const lName = lastName ?? "";
      if (fName || lName) updates.displayName = `${fName} ${lName}`.trim();
    }
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Bruger ikke fundet" }); return; }

    // If role changed to athlete and no athlete profile exists, create one
    if (role === "athlete") {
      const [existing] = await db.select({ id: athletes.id }).from(athletes).where(eq(athletes.userId, id)).limit(1);
      if (!existing) {
        await db.insert(athletes).values({ userId: id });
      }
    }

    res.json({
      data: {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        firstName: updated.firstName,
        lastName: updated.lastName,
        role: updated.role,
        isActive: updated.isActive,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── DELETE /api/admin/users/:id ───────────────────────────────────────

export async function deleteUser(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    if (req.user?.userId === id) {
      res.status(400).json({ error: "Du kan ikke slette din egen konto" });
      return;
    }
    const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Bruger ikke fundet" }); return; }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── PUT /api/admin/users/:id/password ─────────────────────────────────

export async function setPassword(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { password } = req.body;
    if (!password || password.length < 8) {
      res.status(400).json({ error: "Password skal vaere mindst 8 tegn" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [updated] = await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Bruger ikke fundet" }); return; }
    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── POST /api/admin/users/:id/reset-password ──────────────────────────

export async function resetPassword(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const tempPassword = randomUUID().slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const [updated] = await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Bruger ikke fundet" }); return; }
    res.json({ data: { tempPassword } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── Assignments ───────────────────────────────────────────────────────

export async function listAssignments(_req: Request, res: Response) {
  try {
    const rows = await db.select({
      id: coachAthleteAssignments.id,
      coachId: coachAthleteAssignments.coachId,
      athleteId: coachAthleteAssignments.athleteId,
      status: coachAthleteAssignments.status,
      assignedAt: coachAthleteAssignments.assignedAt,
    }).from(coachAthleteAssignments);

    // Enrich with names
    const enriched = await Promise.all(rows.map(async (r) => {
      const [coach] = await db.select({ displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, r.coachId)).limit(1);
      const [athleteUser] = await db.select({ id: athletes.id, userId: athletes.userId }).from(athletes).where(eq(athletes.id, r.athleteId)).limit(1);
      let athleteName = "Ukendt";
      if (athleteUser) {
        const [u] = await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, athleteUser.userId)).limit(1);
        athleteName = u?.displayName ?? "Ukendt";
      }
      return { ...r, coachName: coach?.displayName ?? "Ukendt", coachEmail: coach?.email ?? "", athleteName };
    }));

    res.json({ data: enriched });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function createAssignment(req: Request, res: Response) {
  try {
    const { coachUserId, athleteId } = req.body;
    if (!coachUserId || !athleteId) {
      res.status(400).json({ error: "coachUserId og athleteId er paakraevede" });
      return;
    }

    // Check duplicate
    const [existing] = await db.select().from(coachAthleteAssignments)
      .where(and(eq(coachAthleteAssignments.coachId, coachUserId), eq(coachAthleteAssignments.athleteId, athleteId))).limit(1);
    if (existing) {
      res.status(409).json({ error: "Tilknytningen eksisterer allerede" });
      return;
    }

    const [created] = await db.insert(coachAthleteAssignments).values({
      coachId: coachUserId,
      athleteId,
      status: "active",
    }).returning();

    res.status(201).json({ data: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteAssignment(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const [deleted] = await db.delete(coachAthleteAssignments).where(eq(coachAthleteAssignments.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Tilknytning ikke fundet" }); return; }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
