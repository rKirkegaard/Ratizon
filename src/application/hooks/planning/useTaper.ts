import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";

export interface TaperPlanResult {
  raceDate: string;
  currentCTL: number;
  currentATL: number;
  avgWeeklyTSS: number;
  taperWeeks: number;
  profile: string;
  weeks: Array<{
    weekNumber: number;
    weeklyTss: number;
    reductionPct: number;
    dailyTargets: Array<{ date: string; tss: number; isRestDay: boolean }>;
  }>;
  projection: Array<{ date: string; ctl: number; atl: number; tsb: number }>;
  raceDayProjection: { date: string; ctl: number; atl: number; tsb: number };
}

export function useGenerateTaper(athleteId: string | null) {
  return useMutation({
    mutationFn: (params: { goalId?: string; taperWeeks?: number; profile?: string }) =>
      apiClient.post<TaperPlanResult>(`/planning/${athleteId}/taper/generate`, params),
  });
}
