/**
 * BrickDetector — auto-detects multi-sport "brick" sessions.
 *
 * A brick is two or more consecutive sessions of DIFFERENT sports
 * where the next session starts within a threshold (default 15 min)
 * of the previous session ending.
 *
 * Common bricks:
 *  - bike → run  (most common Ironman brick)
 *  - swim → bike
 *  - swim → bike → run (full triathlon simulation)
 */

export interface SessionForDetection {
  id: string;
  sport: string;
  startedAt: Date;
  durationSeconds: number;
  distanceMeters: number | null;
  tss: number | null;
}

export interface DetectedBrick {
  sessions: SessionForDetection[];
  brickType: string;       // e.g. "bike-run", "swim-bike-run"
  title: string;
  startedAt: Date;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  totalTss: number;
  transitions: number[];   // gap seconds between consecutive sessions
}

const DEFAULT_THRESHOLD_SECONDS = 15 * 60; // 15 minutes

/**
 * Detect brick sessions from a list of sessions (typically same day).
 * Sessions must be sorted by startedAt ASC.
 */
export function detectBricks(
  sessions: SessionForDetection[],
  thresholdSeconds = DEFAULT_THRESHOLD_SECONDS
): DetectedBrick[] {
  if (sessions.length < 2) return [];

  // Sort by start time
  const sorted = [...sessions].sort(
    (a, b) => a.startedAt.getTime() - b.startedAt.getTime()
  );

  const bricks: DetectedBrick[] = [];
  let currentGroup: SessionForDetection[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const prevEnd = prev.startedAt.getTime() + prev.durationSeconds * 1000;
    const gapSeconds = (curr.startedAt.getTime() - prevEnd) / 1000;

    // Must be different sport and within threshold
    if (gapSeconds >= 0 && gapSeconds <= thresholdSeconds && curr.sport !== prev.sport) {
      currentGroup.push(curr);
    } else {
      // Flush current group if it's a valid brick (2+ sessions)
      if (currentGroup.length >= 2) {
        bricks.push(buildBrick(currentGroup));
      }
      currentGroup = [curr];
    }
  }

  // Flush last group
  if (currentGroup.length >= 2) {
    bricks.push(buildBrick(currentGroup));
  }

  return bricks;
}

function buildBrick(sessions: SessionForDetection[]): DetectedBrick {
  const sports = sessions.map((s) => s.sport);
  const brickType = sports.join("-");

  // Calculate transitions (gaps between consecutive sessions)
  const transitions: number[] = [];
  for (let i = 1; i < sessions.length; i++) {
    const prevEnd =
      sessions[i - 1].startedAt.getTime() +
      sessions[i - 1].durationSeconds * 1000;
    const gap = Math.round(
      (sessions[i].startedAt.getTime() - prevEnd) / 1000
    );
    transitions.push(Math.max(0, gap));
  }

  const totalDuration = sessions.reduce((s, x) => s + x.durationSeconds, 0);
  const totalDistance = sessions.reduce(
    (s, x) => s + (x.distanceMeters ?? 0),
    0
  );
  const totalTss = sessions.reduce((s, x) => s + (x.tss ?? 0), 0);

  // Build a human-friendly title
  const sportLabels: Record<string, string> = {
    swim: "Svoem",
    bike: "Cykel",
    run: "Loeb",
    strength: "Styrke",
  };
  const title = sports
    .map((s) => sportLabels[s] || s)
    .join(" + ")
    + " Brick";

  return {
    sessions,
    brickType,
    title,
    startedAt: sessions[0].startedAt,
    totalDurationSeconds: totalDuration,
    totalDistanceMeters: totalDistance,
    totalTss: Math.round(totalTss * 10) / 10,
    transitions,
  };
}
