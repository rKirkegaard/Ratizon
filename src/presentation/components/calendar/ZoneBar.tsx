/**
 * Vertical zone distribution bar for planned sessions.
 * Shows as a right border with colored segments proportional to time in each zone.
 */
import type { SessionBlock } from "@/domain/types/training.types";

const ZONE_COLORS: Record<number, string> = {
  1: "#3A7BFF", 2: "#28CF59", 3: "#F6D74A", 4: "#F57C00", 5: "#D32F2F",
};

interface ZoneBarProps {
  blocks?: SessionBlock[] | null;
  targetZones?: Record<string, number> | null;
  width?: number;
}

export default function ZoneBar({ blocks, targetZones, width = 3 }: ZoneBarProps) {
  // Build zone distribution from blocks
  let zones: Array<{ zone: number; pct: number }> = [];

  if (blocks && blocks.length > 0) {
    const zoneSec: Record<number, number> = {};
    let total = 0;
    for (const b of blocks) {
      const z = b.targetHrZone ?? 2;
      const reps = b.type === "interval" && b.repeatCount ? b.repeatCount : 1;
      const sec = b.durationSeconds * reps + (b.restSeconds ?? 0) * reps;
      zoneSec[z] = (zoneSec[z] ?? 0) + b.durationSeconds * reps;
      zoneSec[1] = (zoneSec[1] ?? 0) + (b.restSeconds ?? 0) * reps; // rest = Z1
      total += sec;
    }
    if (total > 0) {
      zones = Object.entries(zoneSec)
        .filter(([, s]) => s > 0)
        .map(([z, s]) => ({ zone: Number(z), pct: (s / total) * 100 }))
        .sort((a, b) => a.zone - b.zone);
    }
  } else if (targetZones) {
    zones = Object.entries(targetZones)
      .filter(([k]) => k.startsWith("zone"))
      .map(([k, v]) => ({ zone: parseInt(k.replace("zone", "").replace("Pct", "")), pct: v }))
      .filter((z) => z.pct > 0)
      .sort((a, b) => a.zone - b.zone);
  }

  if (zones.length === 0) return null;

  return (
    <div className="flex flex-col overflow-hidden rounded-r" style={{ width, minWidth: width }}>
      {zones.map((z) => (
        <div
          key={z.zone}
          style={{ flex: z.pct, backgroundColor: ZONE_COLORS[z.zone] ?? "#888" }}
        />
      ))}
    </div>
  );
}
