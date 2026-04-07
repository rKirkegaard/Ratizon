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
      role: users.role,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    }).from(users).orderBy(users.role, users.email);

    res.json({ data: allUsers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── POST /api/admin/users ─────────────────────────────────────────────

export async function createUser(req: Request, res: Response) {
  try {
    const { email, password, displayName, role } = req.body;
    if (!email || !password || !displayName) {
      res.status(400).json({ error: "email, password og displayName er paakraevede" });
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
      displayName,
      role: role || "athlete",
    }).returning();

    // Create athlete profile if role is athlete
    if (created.role === "athlete") {
      await db.insert(athletes).values({ userId: created.id });
    }

    res.status(201).json({ data: { id: created.id, email: created.email, displayName: created.displayName, role: created.role } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── PUT /api/admin/users/:id ──────────────────────────────────────────

export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { displayName, role } = req.body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (displayName !== undefined) updates.displayName = displayName;
    if (role !== undefined) updates.role = role;

    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Bruger ikke fundet" }); return; }

    res.json({ data: { id: updated.id, email: updated.email, displayName: updated.displayName, role: updated.role } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── DELETE /api/admin/users/:id ───────────────────────────────────────

export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
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

// ── POST /api/admin/users/:id/reset-password ──────────────────────────

export async function resetPassword(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const tempPassword = randomUUID().slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id));
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
    const { id } = req.params;
    const [deleted] = await db.delete(coachAthleteAssignments).where(eq(coachAthleteAssignments.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Tilknytning ikke fundet" }); return; }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
