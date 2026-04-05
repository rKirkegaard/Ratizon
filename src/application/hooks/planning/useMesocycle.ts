import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";

export interface MesocyclePhase {
  id: string;
  phaseName: string;
  phaseType: string;
  phaseNumber: number;
  startDate: string;
  endDate: string;
  ctlTarget: number | null;
  weeklyHoursTarget: number | null;
  disciplineSplit: Record<string, number> | null;
}

export interface CTLPoint {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

export interface WeeklyActual {
  weekStart: string;
  totalHours: number;
  totalTss: number;
  sessionCount: number;
  swimHours: number;
  bikeHours: number;
  runHours: number;
  strengthHours: number;
}

export interface WeeklyBudget {
  weekStart: string;
  totalHours: number;
  targetTss: number | null;
  swimHours: number;
  bikeHours: number;
  runHours: number;
  strengthHours: number;
}

export interface PhaseCompliance {
  phaseId: string;
  phaseName: string;
  phaseType: string;
  startDate: string;
  endDate: string;
  ctlTarget: number | null;
  weeklyHoursTarget: number | null;
  targetHours: number;
  actualHours: number;
  compliancePct: number;
}

export interface MesocycleData {
  phases: MesocyclePhase[];
  ctlTimeSeries: CTLPoint[];
  weeklyActuals: WeeklyActual[];
  weeklyBudgets: WeeklyBudget[];
  phaseCompliance: PhaseCompliance[];
  mainGoal: {
    title: string;
    targetDate: string | null;
    racePriority: string | null;
  } | null;
}

export function useMesocycle(athleteId: string | null) {
  return useQuery<MesocycleData>({
    queryKey: ["mesocycle", athleteId],
    queryFn: () =>
      apiClient.get<MesocycleData>(`/planning/${athleteId}/mesocycle`),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}
