export interface Goal {
  id: string;
  athleteId: string;
  title: string;
  goalType: "race" | "performance" | "volume" | "health";
  sport: string | null;
  targetDate: string | null;
  raceDistance: number | null;
  raceTargetTime: number | null;
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

export interface DisciplineSplit {
  swimPct: number;
  bikePct: number;
  runPct: number;
}

export interface WeeklyBudget {
  id: string;
  athleteId: string;
  phaseId: string | null;
  weekStartDate: string;
  totalHours: number;
  swimHours: number;
  bikeHours: number;
  runHours: number;
  strengthHours: number;
  targetTss: number | null;
  notes: string | null;
}
