import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";

export interface ComparisonSession {
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
  normalizedPower: number | null;
  avgPace: number | null;
  avgCadence: number | null;
  elevationGain: number | null;
  calories: number | null;
  analytics: {
    efficiencyFactor: number | null;
    decoupling: number | null;
    intensityFactor: number | null;
    variabilityIndex: number | null;
    zones: number[];
    trimp: number | null;
    hrss: number | null;
  } | null;
}

export interface SessionComparisonResult {
  sessionA: ComparisonSession;
  sessionB: ComparisonSession;
  deltas: Record<string, number | null>;
}

export interface PeriodStats {
  startDate: string;
  endDate: string;
  sessionCount: number;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  totalTss: number;
  avgHr: number;
  avgPower: number;
  avgPace: number;
  sportBreakdown: Array<{ sport: string; sessionCount: number; durationSeconds: number; tss: number }>;
}

export interface PeriodComparisonResult {
  periodA: PeriodStats;
  periodB: PeriodStats;
  deltas: Record<string, number>;
}

export function useSessionComparison(
  athleteId: string | null,
  sessionAId: string | null,
  sessionBId: string | null
) {
  return useQuery<SessionComparisonResult>({
    queryKey: ["compare-sessions", athleteId, sessionAId, sessionBId],
    queryFn: () =>
      apiClient.get<SessionComparisonResult>(
        `/analytics/${athleteId}/compare/sessions?a=${sessionAId}&b=${sessionBId}`
      ),
    enabled: !!athleteId && !!sessionAId && !!sessionBId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePeriodComparison(
  athleteId: string | null,
  startA: string | null,
  endA: string | null,
  startB: string | null,
  endB: string | null
) {
  return useQuery<PeriodComparisonResult>({
    queryKey: ["compare-periods", athleteId, startA, endA, startB, endB],
    queryFn: () =>
      apiClient.get<PeriodComparisonResult>(
        `/analytics/${athleteId}/compare/periods?startA=${startA}&endA=${endA}&startB=${startB}&endB=${endB}`
      ),
    enabled: !!athleteId && !!startA && !!endA && !!startB && !!endB,
    staleTime: 5 * 60 * 1000,
  });
}
