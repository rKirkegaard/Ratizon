export interface Goal {
  id: string;
  athleteId: string;
  title: string;
  goalType: "race" | "performance" | "volume" | "health";
  sport: string | null;
  raceSubType: string | null;
  targetDate: string | null;
  raceDistance: number | null;
  raceTargetTime: number | null;
  swimTargetTime: number | null;
  bikeTargetTime: number | null;
  runTargetTime: number | null;
  t1TargetTime: number | null;
  t2TargetTime: number | null;
  racePriority: "A" | "B" | "C" | null;
  status: "active" | "completed" | "cancelled";
  notes: string | null;
  createdAt: string;
}

export interface AthleteTrainingPhase {
  id: string;
  athleteId: string;
  goalId: string | null;
  phaseNumber: number;
  phaseName: string;
  phaseType: "base" | "build" | "peak" | "race" | "recovery" | "transition";
  startDate: string;
  endDate: string;
  ctlTarget: number | null;
  weeklyHoursTarget: number | null;
  disciplineSplit: DisciplineSplit | null;
  notes: string | null;
}

/** Dynamic discipline split — keys are sport_key strings, values are percentages */
export type DisciplineSplit = Record<string, number>;

export interface WeeklyBudget {
  id: string;
  athleteId: string;
  phaseId: string | null;
  weekStartDate: string;
  totalHours: number;
  /** Dynamic sport hours — keys are sport_key strings (e.g. 'swim', 'bike', 'run', 'strength') */
  sportHours: Record<string, number>;
  targetTss: number | null;
  notes: string | null;
}
