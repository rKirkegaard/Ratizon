import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";

// ── Response types ──────────────────────────────────────────────────────

export interface CadenceBucket {
  spm: number;
  pctTime: number;
}

export interface CadenceDistributionResponse {
  data: CadenceBucket[];
}

export interface GCTPoint {
  date: string;
  sessionId: string;
  avgGct: number;
}

export interface GCTBalanceResponse {
  data: GCTPoint[];
}

export interface VerticalRatioPoint {
  date: string;
  sessionId: string;
  avgVo: number;
}

export interface VerticalRatioResponse {
  data: VerticalRatioPoint[];
}

// ── Hooks ───────────────────────────────────────────────────────────────

export function useCadenceDistribution(athleteId: string | null, days: number) {
  return useQuery<CadenceDistributionResponse>({
    queryKey: ["running-cadence-distribution", athleteId, days],
    queryFn: () =>
      apiClient.get<CadenceDistributionResponse>(
        `/analytics/${athleteId}/running/cadence-distribution?days=${days}`
      ),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGCTBalance(athleteId: string | null, days: number) {
  return useQuery<GCTBalanceResponse>({
    queryKey: ["running-gct-balance", athleteId, days],
    queryFn: () =>
      apiClient.get<GCTBalanceResponse>(
        `/analytics/${athleteId}/running/gct-balance?days=${days}`
      ),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useVerticalRatio(athleteId: string | null, days: number) {
  return useQuery<VerticalRatioResponse>({
    queryKey: ["running-vertical-ratio", athleteId, days],
    queryFn: () =>
      apiClient.get<VerticalRatioResponse>(
        `/analytics/${athleteId}/running/vertical-ratio?days=${days}`
      ),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}
