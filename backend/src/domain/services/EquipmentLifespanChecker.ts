/**
 * Equipment Lifespan Checker (S18)
 * Checks all equipment for athletes and creates recommendations when approaching retirement thresholds.
 */

import { db } from "../../infrastructure/database/connection.js";
import { recommendations } from "../../infrastructure/database/schema/ai-coaching.schema.js";
import { sql, eq, and } from "drizzle-orm";

interface EquipmentRow {
  id: string;
  athlete_id: string;
  name: string;
  type: string;
  current_distance_km: number;
  retirement_km: number | null;
  current_hours: number;
  retirement_hours: number | null;
}

export async function checkEquipmentLifespan(): Promise<{ checked: number; created: number }> {
  // Get all active equipment with retirement thresholds
  const rows: EquipmentRow[] = (await db.execute(sql`
    SELECT e.id, e.athlete_id, e.name, e.type,
      COALESCE(e.current_distance_km, 0) AS current_distance_km,
      e.retirement_km,
      COALESCE(e.current_hours, 0) AS current_hours,
      e.retirement_hours
    FROM equipment e
    WHERE e.status = 'active'
      AND (e.retirement_km IS NOT NULL OR e.retirement_hours IS NOT NULL)
  `)).rows as EquipmentRow[];

  let created = 0;

  for (const eq_item of rows) {
    let wearPct = 0;
    let metric = "";

    if (eq_item.retirement_km && eq_item.retirement_km > 0) {
      wearPct = (eq_item.current_distance_km / eq_item.retirement_km) * 100;
      metric = `${Math.round(eq_item.current_distance_km)}km / ${eq_item.retirement_km}km`;
    } else if (eq_item.retirement_hours && eq_item.retirement_hours > 0) {
      wearPct = (eq_item.current_hours / eq_item.retirement_hours) * 100;
      metric = `${Math.round(eq_item.current_hours)}t / ${eq_item.retirement_hours}t`;
    }

    if (wearPct < 75) continue;

    const priority = wearPct >= 100 ? "critical" : wearPct >= 90 ? "high" : "medium";
    const title = wearPct >= 100
      ? `${eq_item.name} har overskredet levetiden`
      : `${eq_item.name} naermer sig udskiftning (${Math.round(wearPct)}%)`;

    // Check if similar recommendation already exists (pending)
    const existing = await db
      .select({ id: recommendations.id })
      .from(recommendations)
      .where(
        and(
          eq(recommendations.athleteId, eq_item.athlete_id),
          eq(recommendations.category, "equipment"),
          eq(recommendations.status, "pending"),
          sql`${recommendations.title} LIKE ${'%' + eq_item.name + '%'}`
        )
      )
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(recommendations).values({
      athleteId: eq_item.athlete_id,
      category: "equipment",
      priority,
      title,
      description: `${eq_item.name} (${eq_item.type}) er paa ${Math.round(wearPct)}% af levetiden (${metric}). Overvaej udskiftning.`,
      reasoning: `Baseret paa ${metric} slitage.`,
      generatedBy: "system",
    });
    created++;
  }

  return { checked: rows.length, created };
}
