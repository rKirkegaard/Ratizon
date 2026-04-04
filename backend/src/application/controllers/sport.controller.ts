import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { sportConfigs } from "../../infrastructure/database/schema/sport.schema.js";
import { eq, and } from "drizzle-orm";
import {
  TRIATHLON_SPORTS,
  RUNNER_SPORTS,
  CYCLIST_SPORTS,
} from "../../infrastructure/database/seed/default-sports.js";

const PRESET_MAP: Record<string, typeof TRIATHLON_SPORTS> = {
  triathlon: TRIATHLON_SPORTS,
  runner: RUNNER_SPORTS,
  cyclist: CYCLIST_SPORTS,
};

export async function listSports(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const rows = await db
      .select()
      .from(sportConfigs)
      .where(
        and(eq(sportConfigs.athleteId, athleteId), eq(sportConfigs.isActive, true))
      )
      .orderBy(sportConfigs.sortOrder);

    const data = rows.map(mapRowToConfig);
    res.json({ data });
  } catch (error) {
    console.error("Fejl ved hentning af sportsindstillinger:", error);
    res.status(500).json({ error: "Kunne ikke hente sportsindstillinger" });
  }
}

export async function addSport(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;
    const body = req.body;

    const [row] = await db
      .insert(sportConfigs)
      .values({
        athleteId,
        sportKey: body.sport_key,
        displayName: body.display_name,
        color: body.color,
        icon: body.icon,
        sortOrder: body.sort_order ?? 0,
        isActive: body.is_active ?? true,
        hasDistance: body.has_distance ?? true,
        hasPower: body.has_power ?? false,
        hasPace: body.has_pace ?? false,
        hasZones: body.has_zones ?? true,
        zoneModel: body.zone_model ?? null,
        dedicatedPage: body.dedicated_page ?? false,
        distanceUnit: body.distance_unit ?? "km",
        paceUnit: body.pace_unit ?? null,
      })
      .returning();

    res.status(201).json({ data: mapRowToConfig(row) });
  } catch (error) {
    console.error("Fejl ved oprettelse af sport:", error);
    res.status(500).json({ error: "Kunne ikke oprette sport" });
  }
}

export async function updateSport(req: Request, res: Response) {
  try {
    const { athleteId, sportKey } = req.params;
    const body = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.display_name !== undefined) updateData.displayName = body.display_name;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.sort_order !== undefined) updateData.sortOrder = body.sort_order;
    if (body.is_active !== undefined) updateData.isActive = body.is_active;
    if (body.has_distance !== undefined) updateData.hasDistance = body.has_distance;
    if (body.has_power !== undefined) updateData.hasPower = body.has_power;
    if (body.has_pace !== undefined) updateData.hasPace = body.has_pace;
    if (body.has_zones !== undefined) updateData.hasZones = body.has_zones;
    if (body.zone_model !== undefined) updateData.zoneModel = body.zone_model;
    if (body.dedicated_page !== undefined) updateData.dedicatedPage = body.dedicated_page;
    if (body.distance_unit !== undefined) updateData.distanceUnit = body.distance_unit;
    if (body.pace_unit !== undefined) updateData.paceUnit = body.pace_unit;

    const [row] = await db
      .update(sportConfigs)
      .set(updateData)
      .where(
        and(eq(sportConfigs.athleteId, athleteId), eq(sportConfigs.sportKey, sportKey))
      )
      .returning();

    if (!row) {
      res.status(404).json({ error: "Sport ikke fundet" });
      return;
    }

    res.json({ data: mapRowToConfig(row) });
  } catch (error) {
    console.error("Fejl ved opdatering af sport:", error);
    res.status(500).json({ error: "Kunne ikke opdatere sport" });
  }
}

export async function deactivateSport(req: Request, res: Response) {
  try {
    const { athleteId, sportKey } = req.params;

    const [row] = await db
      .update(sportConfigs)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(eq(sportConfigs.athleteId, athleteId), eq(sportConfigs.sportKey, sportKey))
      )
      .returning();

    if (!row) {
      res.status(404).json({ error: "Sport ikke fundet" });
      return;
    }

    res.json({ data: mapRowToConfig(row), message: "Sport deaktiveret" });
  } catch (error) {
    console.error("Fejl ved deaktivering af sport:", error);
    res.status(500).json({ error: "Kunne ikke deaktivere sport" });
  }
}

export async function applyPreset(req: Request, res: Response) {
  try {
    const { athleteId, presetName } = req.params;
    const preset = PRESET_MAP[presetName];

    if (!preset) {
      res.status(400).json({
        error: `Ukendt preset: ${presetName}. Gyldige: ${Object.keys(PRESET_MAP).join(", ")}`,
      });
      return;
    }

    // Deactivate all existing sports for this athlete
    await db
      .update(sportConfigs)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(sportConfigs.athleteId, athleteId));

    // Upsert each sport from preset
    const results = [];
    for (const sport of preset) {
      const [row] = await db
        .insert(sportConfigs)
        .values({
          athleteId,
          sportKey: sport.sport_key,
          displayName: sport.display_name,
          color: sport.color,
          icon: sport.icon,
          sortOrder: sport.sort_order,
          isActive: true,
          hasDistance: sport.has_distance,
          hasPower: sport.has_power,
          hasPace: sport.has_pace,
          hasZones: sport.has_zones,
          zoneModel: sport.zone_model,
          dedicatedPage: sport.dedicated_page,
          distanceUnit: sport.distance_unit,
          paceUnit: sport.pace_unit,
        })
        .onConflictDoUpdate({
          target: [sportConfigs.athleteId, sportConfigs.sportKey],
          set: {
            displayName: sport.display_name,
            color: sport.color,
            icon: sport.icon,
            sortOrder: sport.sort_order,
            isActive: true,
            hasDistance: sport.has_distance,
            hasPower: sport.has_power,
            hasPace: sport.has_pace,
            hasZones: sport.has_zones,
            zoneModel: sport.zone_model,
            dedicatedPage: sport.dedicated_page,
            distanceUnit: sport.distance_unit,
            paceUnit: sport.pace_unit,
            updatedAt: new Date(),
          },
        })
        .returning();
      results.push(mapRowToConfig(row));
    }

    res.json({ data: results, message: `Preset '${presetName}' anvendt` });
  } catch (error) {
    console.error("Fejl ved anvendelse af preset:", error);
    res.status(500).json({ error: "Kunne ikke anvende preset" });
  }
}

function mapRowToConfig(row: typeof sportConfigs.$inferSelect) {
  return {
    sport_key: row.sportKey,
    display_name: row.displayName,
    color: row.color,
    icon: row.icon,
    sort_order: row.sortOrder,
    is_active: row.isActive,
    has_distance: row.hasDistance,
    has_power: row.hasPower,
    has_pace: row.hasPace,
    has_zones: row.hasZones,
    zone_model: row.zoneModel,
    dedicated_page: row.dedicatedPage,
    distance_unit: row.distanceUnit,
    pace_unit: row.paceUnit,
  };
}
