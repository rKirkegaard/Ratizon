import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { athletePagePermissions } from "../../infrastructure/database/schema/athlete.schema.js";
import { eq, and } from "drizzle-orm";

interface PageDef { key: string; label: string; description: string }
interface SectionDef { title: string; pages: PageDef[] }

const AVAILABLE_SECTIONS: SectionDef[] = [
  {
    title: "DAGLIGT",
    pages: [
      { key: "dashboard", label: "Dashboard", description: "Hovedoversigt med stats og kalender" },
      { key: "calendar", label: "Kalender", description: "Traeningskalender og planlaegning" },
    ],
  },
  {
    title: "ANALYSE",
    pages: [
      { key: "weekly-report", label: "Ugerapport", description: "Ugentlig traeningsrapport" },
      { key: "performance", label: "Performance", description: "Performanceanalyse og trends" },
      { key: "load-recovery", label: "Load & Restitution", description: "Traeningsbelastning og restitution" },
      { key: "wellness", label: "Wellness", description: "Soevn, stress og restitution" },
      { key: "comparison", label: "Sammenligning", description: "Sammenligning af traeningssessioner" },
      { key: "test-baselines", label: "Test & Baselines", description: "Test resultater og baseline historik" },
    ],
  },
  {
    title: "DISCIPLIN",
    pages: [
      { key: "discipline-run", label: "Loeb", description: "Loebedisciplin oversigt" },
      { key: "discipline-bike", label: "Cykling", description: "Cykeldisciplin oversigt" },
      { key: "discipline-swim", label: "Svoemning", description: "Svoemmedisciplin oversigt" },
    ],
  },
  {
    title: "PLAN & MAAL",
    pages: [
      { key: "season-goals", label: "Saeson & Maal", description: "Saeson planlaegning og maal" },
      { key: "raceplan", label: "Raceplan", description: "Race planlaegning og strategi" },
    ],
  },
  {
    title: "DATA",
    pages: [
      { key: "sessions", label: "Sessioner", description: "Sessionsoversigt" },
      { key: "upload", label: "Upload", description: "Upload traeningsfiler" },
      { key: "equipment", label: "Udstyr", description: "Udstyrsstyring" },
    ],
  },
  {
    title: "INDSTILLINGER",
    pages: [
      { key: "settings", label: "App & Zoner", description: "App og zone indstillinger" },
    ],
  },
];

const ALL_PAGES = AVAILABLE_SECTIONS.flatMap((s) => s.pages);

// GET /api/permissions/pages
export async function listPages(_req: Request, res: Response) {
  res.json({ data: { sections: AVAILABLE_SECTIONS, pages: ALL_PAGES } });
}

// GET /api/permissions/athlete/:athleteId  (legacy)
export async function getAthletePermissions(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const rows = await db.select({
      pageKey: athletePagePermissions.pageKey,
      hasAccess: athletePagePermissions.hasAccess,
    }).from(athletePagePermissions).where(eq(athletePagePermissions.athleteId, athleteId));

    const existing = new Map(rows.map((r) => [r.pageKey, r.hasAccess]));
    const permissions = ALL_PAGES.map((page) => ({
      page_key: page.key,
      has_access: existing.has(page.key) ? existing.get(page.key) : true,
    }));

    res.json({ data: { athleteId, permissions } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/permissions/athlete/:athleteId  (legacy)
export async function updateAthletePermissions(req: Request, res: Response) {
  try {
    const athleteId = req.params.athleteId as string;
    const { permissions } = req.body;
    if (!permissions || !Array.isArray(permissions)) {
      res.status(400).json({ error: "permissions array er paakraevet" });
      return;
    }

    for (const perm of permissions) {
      const [existing] = await db.select({ id: athletePagePermissions.id })
        .from(athletePagePermissions)
        .where(and(eq(athletePagePermissions.athleteId, athleteId), eq(athletePagePermissions.pageKey, perm.page_key)))
        .limit(1);

      if (existing) {
        await db.update(athletePagePermissions)
          .set({ hasAccess: perm.has_access, updatedAt: new Date() })
          .where(eq(athletePagePermissions.id, existing.id));
      } else {
        await db.insert(athletePagePermissions).values({
          athleteId,
          pageKey: perm.page_key,
          hasAccess: perm.has_access,
        });
      }
    }

    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/permissions/user/:userId
export async function getUserPermissions(req: Request, res: Response) {
  try {
    const userId = req.params.userId as string;
    const rows = await db.select({
      pageKey: athletePagePermissions.pageKey,
      hasAccess: athletePagePermissions.hasAccess,
    }).from(athletePagePermissions).where(eq(athletePagePermissions.userId, userId));

    const existing = new Map(rows.map((r) => [r.pageKey, r.hasAccess]));
    const permissions = ALL_PAGES.map((page) => ({
      page_key: page.key,
      has_access: existing.has(page.key) ? existing.get(page.key) : true,
    }));

    res.json({ data: { userId, permissions } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/permissions/user/:userId
export async function updateUserPermissions(req: Request, res: Response) {
  try {
    const userId = req.params.userId as string;
    const { permissions } = req.body;
    if (!permissions || !Array.isArray(permissions)) {
      res.status(400).json({ error: "permissions array er paakraevet" });
      return;
    }

    for (const perm of permissions) {
      const [existing] = await db.select({ id: athletePagePermissions.id })
        .from(athletePagePermissions)
        .where(and(eq(athletePagePermissions.userId, userId), eq(athletePagePermissions.pageKey, perm.page_key)))
        .limit(1);

      if (existing) {
        await db.update(athletePagePermissions)
          .set({ hasAccess: perm.has_access, updatedAt: new Date() })
          .where(eq(athletePagePermissions.id, existing.id));
      } else {
        await db.insert(athletePagePermissions).values({
          userId,
          pageKey: perm.page_key,
          hasAccess: perm.has_access,
        });
      }
    }

    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
