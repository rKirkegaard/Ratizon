import type { Sport } from "./athlete.types";

export interface Session {
  id: string;
  athleteId: string;
  plannedSessionId: string | null;
  sport: Sport;
  sessionType: string;
  title: string;
  startedAt: string;
  durationSeconds: number;
  distanceMeters: number | null;
  tss: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPower: number | null;
  normalizedPower: number | null;
  avgPace: number | null;
  avgCadence: number | null;
  elevationGain: number | null;
  calories: number | null;
  sessionQuality: number | null;
  compliancePct: number | null;
  rpe: number | null;
  notes: string | null;
  source: string | null;
  externalId: string | null;
  createdAt: string;
}

export interface SessionTrackpoint {
  id: string;
  sessionId: string;
  timestamp: string;
  lat: number | null;
  lng: number | null;
  altitude: number | null;
  hr: number | null;
  power: number | null;
  cadence: number | null;
  speed: number | null;
  distance: number | null;
  temperature: number | null;
}

export interface SessionLap {
  id: string;
  sessionId: string;
  lapNumber: number;
  startTime: string;
  durationSeconds: number;
  distanceMeters: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPower: number | null;
  avgPace: number | null;
  avgCadence: number | null;
}

export interface PlannedSession {
  id: string;
  athleteId: string;
  sport: Sport;
  scheduledDate: string;
  sessionPurpose: string;
  title: string;
  description: string | null;
  targetDurationSeconds: number | null;
  targetDistanceMeters: number | null;
  targetTss: number | null;
  targetZones: TargetZones | null;
  aiGenerated: boolean;
  completedSessionId: string | null;
  createdAt: string;
}

export interface TargetZones {
  zone1Pct: number;
  zone2Pct: number;
  zone3Pct: number;
  zone4Pct: number;
  zone5Pct: number;
}
