import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { db } from "../../infrastructure/database/connection.js";
import { users, athletes } from "../../infrastructure/database/schema/athlete.schema.js";
import { refreshTokens, authAuditLog } from "../../infrastructure/database/schema/auth.schema.js";
import { sportConfigs } from "../../infrastructure/database/schema/sport.schema.js";
import { eq, and } from "drizzle-orm";
import type { AuthUser } from "../middleware/auth.middleware.js";

const JWT_SECRET = process.env.JWT_SECRET || "ratizon-dev-secret-change-me";
const ACCESS_TOKEN_EXPIRES = "1h";
const REFRESH_TOKEN_DAYS = 30;

// ── Triathlon default sport configs ────────────────────────────────────

const TRIATHLON_PRESETS = [
  {
    sportKey: "swim",
    displayName: "Svoemning",
    color: "var(--sport-swim)",
    icon: "waves",
    sortOrder: 1,
    hasDistance: true,
    hasPower: false,
    hasPace: true,
    hasZones: true,
    zoneModel: "hr",
    dedicatedPage: true,
    distanceUnit: "m",
    paceUnit: "min/100m",
  },
  {
    sportKey: "bike",
    displayName: "Cykling",
    color: "var(--sport-bike)",
    icon: "bike",
    sortOrder: 2,
    hasDistance: true,
    hasPower: true,
    hasPace: false,
    hasZones: true,
    zoneModel: "power",
    dedicatedPage: true,
    distanceUnit: "km",
    paceUnit: null,
  },
  {
    sportKey: "run",
    displayName: "Loeb",
    color: "var(--sport-run)",
    icon: "footprints",
    sortOrder: 3,
    hasDistance: true,
    hasPower: false,
    hasPace: true,
    hasZones: true,
    zoneModel: "hr",
    dedicatedPage: true,
    distanceUnit: "km",
    paceUnit: "min/km",
  },
  {
    sportKey: "strength",
    displayName: "Styrke",
    color: "var(--sport-strength)",
    icon: "dumbbell",
    sortOrder: 4,
    hasDistance: false,
    hasPower: false,
    hasPace: false,
    hasZones: false,
    zoneModel: null,
    dedicatedPage: false,
    distanceUnit: null,
    paceUnit: null,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────

function generateAccessToken(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

function generateRefreshToken(): string {
  return randomUUID() + "-" + randomUUID();
}

async function logAuditEvent(
  userId: string | null,
  action: string,
  success: boolean,
  req: Request,
  details?: string
) {
  try {
    await db.insert(authAuditLog).values({
      userId,
      action,
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.ip || null,
      userAgent: req.headers["user-agent"] || null,
      details: details || null,
      success,
    });
  } catch {
    // Audit logging should not break the flow
  }
}

async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

  await db.insert(refreshTokens).values({
    userId,
    token,
    expiresAt,
  });
}

// ── POST /api/auth/register ────────────────────────────────────────────

export async function register(req: Request, res: Response) {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: { message: "Alle felter er paakraevede: email, password, firstName, lastName" } });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: { message: "Adgangskode skal vaere mindst 8 tegn" } });
      return;
    }

    // Check existing user
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: { message: "En bruger med denne e-mail eksisterer allerede" } });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const displayName = `${firstName} ${lastName}`;
    const userRole = role === "coach" ? "coach" : "athlete";

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash,
        displayName,
        role: userRole,
      })
      .returning();

    // Create athlete profile
    const [newAthlete] = await db
      .insert(athletes)
      .values({
        userId: newUser.id,
      })
      .returning();

    // Create default sport configs (triathlon preset)
    for (const preset of TRIATHLON_PRESETS) {
      await db.insert(sportConfigs).values({
        athleteId: newAthlete.id,
        ...preset,
      });
    }

    // Generate tokens
    const authPayload: AuthUser = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      athleteId: newAthlete.id,
    };

    const accessToken = generateAccessToken(authPayload);
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(newUser.id, refreshToken);

    await logAuditEvent(newUser.id, "register", true, req);

    res.status(201).json({
      data: {
        accessToken,
        refreshToken,
        user: {
          id: newUser.id,
          email: newUser.email,
          displayName: newUser.displayName,
          role: newUser.role,
          athleteId: newAthlete.id,
        },
      },
    });
  } catch (error: any) {
    console.error("Fejl ved registrering:", error);
    res.status(500).json({ error: { message: "Intern serverfejl ved registrering" } });
  }
}

// ── POST /api/auth/login ───────────────────────────────────────────────

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: { message: "E-mail og adgangskode er paakraevet" } });
      return;
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      await logAuditEvent(null, "login", false, req, `Ukendt e-mail: ${email}`);
      res.status(401).json({ error: { message: "Ugyldig e-mail eller adgangskode" } });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await logAuditEvent(user.id, "login", false, req, "Forkert adgangskode");
      res.status(401).json({ error: { message: "Ugyldig e-mail eller adgangskode" } });
      return;
    }

    // Get athlete id
    const [athlete] = await db
      .select({ id: athletes.id })
      .from(athletes)
      .where(eq(athletes.userId, user.id))
      .limit(1);

    const authPayload: AuthUser = {
      userId: user.id,
      email: user.email,
      role: user.role,
      athleteId: athlete?.id ?? null,
    };

    const accessToken = generateAccessToken(authPayload);
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(user.id, refreshToken);

    await logAuditEvent(user.id, "login", true, req);

    res.json({
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          athleteId: athlete?.id ?? null,
        },
      },
    });
  } catch (error: any) {
    console.error("Fejl ved login:", error);
    res.status(500).json({ error: { message: "Intern serverfejl ved login" } });
  }
}

// ── POST /api/auth/refresh ─────────────────────────────────────────────

export async function refresh(req: Request, res: Response) {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({ error: { message: "Refresh token mangler" } });
      return;
    }

    // Find token
    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.token, token), eq(refreshTokens.revoked, false)))
      .limit(1);

    if (!storedToken) {
      res.status(401).json({ error: { message: "Ugyldig refresh token" } });
      return;
    }

    if (new Date() > storedToken.expiresAt) {
      // Revoke expired token
      await db
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.id, storedToken.id));
      res.status(401).json({ error: { message: "Refresh token udloebet" } });
      return;
    }

    // Revoke old token (rotate)
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.id, storedToken.id));

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, storedToken.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: { message: "Bruger ikke fundet" } });
      return;
    }

    // Get athlete id
    const [athlete] = await db
      .select({ id: athletes.id })
      .from(athletes)
      .where(eq(athletes.userId, user.id))
      .limit(1);

    const authPayload: AuthUser = {
      userId: user.id,
      email: user.email,
      role: user.role,
      athleteId: athlete?.id ?? null,
    };

    const newAccessToken = generateAccessToken(authPayload);
    const newRefreshToken = generateRefreshToken();
    await storeRefreshToken(user.id, newRefreshToken);

    await logAuditEvent(user.id, "refresh", true, req);

    res.json({
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          athleteId: athlete?.id ?? null,
        },
      },
    });
  } catch (error: any) {
    console.error("Fejl ved token refresh:", error);
    res.status(500).json({ error: { message: "Intern serverfejl ved refresh" } });
  }
}

// ── POST /api/auth/logout ──────────────────────────────────────────────

export async function logout(req: Request, res: Response) {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      await db
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.token, token));
    }

    const userId = req.user?.userId ?? null;
    await logAuditEvent(userId, "logout", true, req);

    res.json({ data: { message: "Logget ud" } });
  } catch (error: any) {
    console.error("Fejl ved logout:", error);
    res.status(500).json({ error: { message: "Intern serverfejl ved logout" } });
  }
}

// ── GET /api/auth/me ───────────────────────────────────────────────────

export async function getMe(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({ error: { message: "Ikke autentificeret" } });
      return;
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        avatarUrl: users.avatarUrl,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: { message: "Bruger ikke fundet" } });
      return;
    }

    const [athlete] = await db
      .select({ id: athletes.id })
      .from(athletes)
      .where(eq(athletes.userId, user.id))
      .limit(1);

    res.json({
      data: {
        ...user,
        athleteId: athlete?.id ?? null,
      },
    });
  } catch (error: any) {
    console.error("Fejl ved hentning af bruger:", error);
    res.status(500).json({ error: { message: "Intern serverfejl" } });
  }
}

// ─── Dev Login (development only) ───

export async function devListUsers(req: Request, res: Response) {
  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      display_name: users.displayName,
      role: users.role,
    }).from(users).orderBy(users.role, users.email);

    // Get athlete IDs
    const allAthletes = await db.select({ id: athletes.id, userId: athletes.userId }).from(athletes);
    const athleteMap = new Map(allAthletes.map(a => [a.userId, a.id]));

    res.json(allUsers.map(u => ({
      ...u,
      athlete_id: athleteMap.get(u.id) || null,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function devLogin(req: Request, res: Response) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [athlete] = await db.select().from(athletes).where(eq(athletes.userId, user.id));

    const JWT_SECRET = process.env.JWT_SECRET || 'ratizon-dev-secret';
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    const refreshToken = randomUUID();

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        athleteId: athlete?.id ?? null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// ── PUT /api/auth/change-password ─────────────────────────────────────

export async function changePassword(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ error: "Ikke autentificeret", code: "NOT_AUTHENTICATED" }); return; }

    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ error: "Alle felter er paakraevede", code: "MISSING_FIELDS" }); return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: "De to passwords er ikke ens", code: "PASSWORDS_DO_NOT_MATCH" }); return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "Password skal vaere mindst 8 tegn", code: "PASSWORD_REQUIREMENTS_NOT_MET" }); return;
    }
    if (!/[0-9]/.test(newPassword)) {
      res.status(400).json({ error: "Password skal indeholde mindst ét tal", code: "PASSWORD_REQUIREMENTS_NOT_MET" }); return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      res.status(400).json({ error: "Password skal indeholde mindst ét stort bogstav", code: "PASSWORD_REQUIREMENTS_NOT_MET" }); return;
    }

    const [user] = await db.select({ id: users.id, passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId as string)).limit(1);
    if (!user) { res.status(404).json({ error: "Bruger ikke fundet", code: "NOT_FOUND" }); return; }

    const validCurrent = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validCurrent) {
      res.status(400).json({ error: "Det nuvaerende password er forkert", code: "INVALID_CURRENT_PASSWORD" }); return;
    }

    if (currentPassword === newPassword) {
      res.status(400).json({ error: "Det nye password maa ikke vaere det samme som det nuvaerende", code: "SAME_AS_CURRENT" }); return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, userId as string));

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
