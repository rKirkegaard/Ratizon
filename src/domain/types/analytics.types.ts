export interface SessionAnalytics {
  id: string;
  sessionId: string;
  efficiencyFactor: number | null;
  decoupling: number | null;
  intensityFactor: number | null;
  variabilityIndex: number | null;
  zone1Seconds: number;
  zone2Seconds: number;
  zone3Seconds: number;
  zone4Seconds: number;
  zone5Seconds: number;
  trimp: number | null;
  hrss: number | null;
}

export interface SessionPowerCurve {
  id: string;
  sessionId: string;
  durationSeconds: number;
  maxPower: number;
}

export interface AthletePmc {
  id: string;
  athleteId: string;
  date: string;
  sport: string;
  ctl: number;
  atl: number;
  tsb: number;
  monotony: number | null;
  strain: number | null;
  rampRate: number | null;
}

export interface AthletePowerRecord {
  id: string;
  athleteId: string;
  sport: string;
  durationSeconds: number;
  maxPower: number;
  sessionId: string | null;
  recordedAt: string;
}

export interface SessionQualityAssessment {
  id: string;
  sessionId: string;
  overallScore: number;
  paceConsistency: number | null;
  hrDrift: number | null;
  zoneAdherence: number | null;
  notes: string | null;
  assessedAt: string;
}
