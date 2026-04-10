/**
 * Low-level block calculations for TSS, duration, distance.
 * Used by sessionMetrics.ts and WorkoutVisualization.
 */

import { parseMssToPaceSec } from "./paceUtils";
import type { SessionBlock } from "@/domain/types/training.types";

const ZONE_IF: Record<number, number> = {
  1: 0.55, 2: 0.70, 3: 0.82, 4: 0.91, 5: 1.00,
};

export function calcBlocksTss(
  blocks: SessionBlock[],
  sport?: string,
  thresholdPace?: string | number | null
): number {
  const thresholdSec = parseMssToPaceSec(thresholdPace);
  let tss = 0;

  for (const b of blocks) {
    const zone = b.targetHrZone ?? 2;
    const reps = b.type === "interval" && b.repeatCount ? b.repeatCount : 1;
    const workSec = b.durationSeconds * reps;
    const restSec = (b.restSeconds ?? 0) * reps;
    const workPace = parseMssToPaceSec(b.targetPace);
    const restPace = parseMssToPaceSec(b.restPace);

    if (sport === "run" && thresholdSec && workPace) {
      const workIF = thresholdSec / workPace;
      tss += (workSec * workIF * workIF * 100) / 3600;
      if (restPace && restSec > 0) {
        const restIF = thresholdSec / restPace;
        tss += (restSec * restIF * restIF * 100) / 3600;
      } else if (restSec > 0) {
        tss += (restSec * ZONE_IF[1] * ZONE_IF[1] * 100) / 3600;
      }
    } else {
      const ifFactor = ZONE_IF[zone] ?? 0.70;
      tss += (workSec * ifFactor * ifFactor * 100) / 3600;
      tss += (restSec * ZONE_IF[1] * ZONE_IF[1] * 100) / 3600;
    }
  }
  return tss;
}

export function calcBlocksDuration(blocks: SessionBlock[]): number {
  let dur = 0;
  for (const b of blocks) {
    const reps = b.type === "interval" && b.repeatCount ? b.repeatCount : 1;
    dur += b.durationSeconds * reps + (b.restSeconds ?? 0) * reps;
  }
  return dur;
}

export function calcBlocksDistance(blocks: SessionBlock[]): number {
  let km = 0;
  for (const b of blocks) {
    const reps = b.type === "interval" && b.repeatCount ? b.repeatCount : 1;
    const workPace = parseMssToPaceSec(b.targetPace);
    const restPace = parseMssToPaceSec(b.restPace);
    if (workPace) km += (b.durationSeconds * reps) / workPace;
    if (restPace && b.restSeconds) km += (b.restSeconds * reps) / restPace;
  }
  return km;
}
