export interface BrickSegment {
  id: string;
  sessionId: string;
  segmentOrder: number;
  sport: string;
  session?: {
    id: string;
    sport: string;
    title: string;
    startedAt: string;
    durationSeconds: number;
    distanceMeters: number | null;
    tss: number | null;
    avgHr: number | null;
    maxHr: number | null;
    avgPower: number | null;
    avgPace: number | null;
    avgCadence: number | null;
  } | null;
}

export interface SessionBrick {
  id: string;
  athleteId: string;
  title: string;
  brickType: string;
  startedAt: string;
  totalDurationSeconds: number;
  totalDistanceMeters: number | null;
  totalTss: number | null;
  t1Seconds: number | null;
  t2Seconds: number | null;
  notes: string | null;
  autoDetected: boolean;
  segments: BrickSegment[];
}

export interface BrickTransition {
  brickId: string;
  brickType: string;
  t1Seconds: number | null;
  t2Seconds: number | null;
  segments: Array<{
    segmentOrder: number;
    sport: string;
    sessionId: string;
  }>;
  runFirst15Min: Array<{
    offsetSec: number;
    hr: number | null;
    speed: number | null;
  }>;
}
