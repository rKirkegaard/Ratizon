export interface WellnessDaily {
  id: string;
  athleteId: string;
  date: string;
  sleepHours: number | null;
  sleepQuality: number | null;
  restingHr: number | null;
  hrvMssd: number | null;
  bodyWeight: number | null;
  bodyBattery: number | null;
  stressLevel: number | null;
  fatigue: number | null;
  soreness: number | null;
  mood: number | null;
  motivation: number | null;
  notes: string | null;
  createdAt: string;
}

export interface Injury {
  id: string;
  athleteId: string;
  bodyPart: string;
  description: string;
  severity: "mild" | "moderate" | "severe";
  startDate: string;
  endDate: string | null;
  status: "active" | "recovered" | "chronic";
  notes: string | null;
}

export interface AthleteStreak {
  id: string;
  athleteId: string;
  streakType: "training_days" | "wellness_logging" | "weekly_goal";
  currentCount: number;
  longestCount: number;
  lastActivityDate: string;
}
