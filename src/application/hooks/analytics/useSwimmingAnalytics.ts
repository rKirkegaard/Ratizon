import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";

// ── Response types ──────────────────────────────────────────────────────

export interface SwimPacePoint {
  date: string;
  sessionId: string;
  avgPace: number; // seconds per 100m
}

export interface SwimPaceProgressionResponse {
  data: SwimPacePoint[];
}

export interface SwolfPoint {
  date: string;
  sessionId: string;
  avgSwolf: number;
}

export interface SwolfTrendResponse {
  data: SwolfPoint[];
}

// ── Hooks ───────────────────────────────────────────────────────────────

export function useSwimPaceProgression(athleteId: string | null) {
  return useQuery<SwimPaceProgressionResponse>({
    queryKey: ["swim-pace-progression", athleteId],
    queryFn: () =>
      apiClient.get<SwimPaceProgressionResponse>(
        `/analytics/${athleteId}/swimming/pace-progression`
      ),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSwolfTrend(athleteId: string | null) {
  return useQuery<SwolfTrendResponse>({
    queryKey: ["swim-swolf-trend", athleteId],
    queryFn: () =>
      apiClient.get<SwolfTrendResponse>(
        `/analytics/${athleteId}/swimming/swolf-trend`
      ),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}
