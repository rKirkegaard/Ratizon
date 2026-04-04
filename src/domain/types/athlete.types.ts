export interface User {
  id: string;
  email: string;
  displayName: string;
  role: "athlete" | "coach" | "admin";
  avatarUrl: string | null;
  createdAt: string;
}

export interface Athlete {
  id: string;
  userId: string;
  dateOfBirth: string | null;
  gender: "male" | "female" | "other" | null;
  weight: number | null;
  restingHr: number | null;
  maxHr: number | null;
  ftp: number | null;
  lthr: number | null;
  swimCss: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AthleteProfile {
  id: string;
  athleteId: string;
  sport: Sport;
  hrZones: HrZones | null;
  paceZones: PaceZones | null;
  powerZones: PowerZones | null;
  updatedAt: string;
}

export type Sport = "swim" | "bike" | "run";

export interface HrZones {
  zone1: { min: number; max: number };
  zone2: { min: number; max: number };
  zone3: { min: number; max: number };
  zone4: { min: number; max: number };
  zone5: { min: number; max: number };
}

export interface PaceZones {
  zone1: { minPace: number; maxPace: number };
  zone2: { minPace: number; maxPace: number };
  zone3: { minPace: number; maxPace: number };
  zone4: { minPace: number; maxPace: number };
  zone5: { minPace: number; maxPace: number };
}

export interface PowerZones {
  zone1: { min: number; max: number };
  zone2: { min: number; max: number };
  zone3: { min: number; max: number };
  zone4: { min: number; max: number };
  zone5: { min: number; max: number };
}

export interface CoachAthleteAssignment {
  id: string;
  coachId: string;
  athleteId: string;
  status: "active" | "pending" | "inactive";
  assignedAt: string;
}
