import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import type { WellnessDaily } from "@/domain/types/wellness.types";

// ── Response types ──────────────────────────────────────────────────────

export interface WellnessLatestResponse {
  latest: WellnessDaily | null;
}

export interface WellnessHistoryResponse {
  history: WellnessDaily[];
}

export interface HRVGateResponse {
  gate: "green" | "amber" | "red";
  baseline: number | null;
  baselineSd: number | null;
  currentHrv: number | null;
  status: string;
  recommendation: string;
}

export interface WellnessLogPayload {
  date?: string;
  sleepHours?: number;
  sleepQuality?: number;
  restingHr?: number;
  hrvMssd?: number;
  bodyWeight?: number;
  bodyBattery?: number;
  stressLevel?: number;
  fatigue?: number;
  soreness?: number;
  mood?: number;
  motivation?: number;
  notes?: string;
}

// ── Hooks ───────────────────────────────────────────────────────────────

export function useWellnessLatest(athleteId: string | null) {
  return useQuery<WellnessLatestResponse>({
    queryKey: ["wellness-latest", athleteId],
    queryFn: () =>
      apiClient.get<WellnessLatestResponse>(`/wellness/${athleteId}/latest`),
    enabled: !!athleteId,
    staleTime: 30 * 1000,
  });
}

export function useWellnessHistory(athleteId: string | null, days: number = 30) {
  return useQuery<WellnessHistoryResponse>({
    queryKey: ["wellness-history", athleteId, days],
    queryFn: () =>
      apiClient.get<WellnessHistoryResponse>(
        `/wellness/${athleteId}/history?days=${days}`
      ),
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });
}

export function useHRVGate(athleteId: string | null) {
  return useQuery<HRVGateResponse>({
    queryKey: ["hrv-gate", athleteId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = await apiClient.get(`/wellness/${athleteId}/hrv-gate`);
      return {
        gate: raw.gateStatus ?? raw.gate ?? "amber",
        baseline: raw.baseline ?? null,
        baselineSd: raw.sd ?? raw.baselineSd ?? null,
        currentHrv: raw.latestHrv ?? raw.currentHrv ?? null,
        status: raw.message ?? raw.status ?? "",
        recommendation: raw.recommendation ?? raw.message ?? "",
      };
    },
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });
}

export function useLogWellness(athleteId: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: WellnessLogPayload) =>
      apiClient.post(`/wellness/${athleteId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wellness-latest", athleteId] });
      queryClient.invalidateQueries({ queryKey: ["wellness-history", athleteId] });
      queryClient.invalidateQueries({ queryKey: ["hrv-gate", athleteId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", athleteId] });
    },
  });

  return {
    logWellness: mutation.mutate,
    logWellnessAsync: mutation.mutateAsync,
    isLogging: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}
