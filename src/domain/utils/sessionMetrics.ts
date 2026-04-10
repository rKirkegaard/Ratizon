/**
 * THE ONE FUNCTION for planned session metrics.
 * All components call this instead of doing their own calculations.
 */

import type { PlannedSession } from "@/domain/types/training.types";
import { calcBlocksTss, calcBlocksDuration, calcBlocksDistance } from "./tssCalculator";

export interface SessionMetrics {
  durationSec: number;
  tss: number;
  distanceKm: number;
}

/**
 * Calculate metrics for a planned session.
 * Uses structured blocks when available, falls back to target fields.
 */
export function calcPlannedSessionMetrics(
  session: PlannedSession,
  thresholdPace?: string | null
): SessionMetrics {
  let durationSec = 0;
  let tss = 0;
  let distanceKm = 0;

  if (session.sessionBlocks && session.sessionBlocks.length > 0) {
    durationSec = calcBlocksDuration(session.sessionBlocks);
    tss = calcBlocksTss(session.sessionBlocks, session.sport, thresholdPace);
    distanceKm = calcBlocksDistance(session.sessionBlocks);
  }

  // Fallbacks when blocks don't provide values
  if (durationSec === 0 && session.targetDurationSeconds) durationSec = session.targetDurationSeconds;
  if (tss === 0 && session.targetTss) tss = session.targetTss;
  if (distanceKm === 0 && session.targetDistanceMeters) distanceKm = session.targetDistanceMeters / 1000;

  return { durationSec, tss, distanceKm };
}
