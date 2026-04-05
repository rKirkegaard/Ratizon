import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import type { RacePlan, RaceTimeline } from "@/domain/types/race-plan.types";

export function useRacePlans(athleteId: string | null) {
  return useQuery<RacePlan[]>({
    queryKey: ["race-plans", athleteId],
    queryFn: async () => {
      const raw = await apiClient.get(`/planning/${athleteId}/race-plans`);
      return Array.isArray(raw) ? raw : [];
    },
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });
}

export function useRacePlan(athleteId: string | null, planId: string | null) {
  return useQuery<RacePlan>({
    queryKey: ["race-plan", athleteId, planId],
    queryFn: () => apiClient.get<RacePlan>(`/planning/${athleteId}/race-plans/${planId}`),
    enabled: !!athleteId && !!planId,
    staleTime: 60 * 1000,
  });
}

export function useRaceTimeline(athleteId: string | null, planId: string | null) {
  return useQuery<RaceTimeline>({
    queryKey: ["race-timeline", athleteId, planId],
    queryFn: () => apiClient.get<RaceTimeline>(`/planning/${athleteId}/race-plans/${planId}/timeline`),
    enabled: !!athleteId && !!planId,
    staleTime: 60 * 1000,
  });
}

export function useCreateRacePlan(athleteId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RacePlan>) =>
      apiClient.post<RacePlan>(`/planning/${athleteId}/race-plans`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["race-plans", athleteId] }),
  });
}

export function useUpdateRacePlan(athleteId: string | null, planId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RacePlan>) =>
      apiClient.put<RacePlan>(`/planning/${athleteId}/race-plans/${planId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["race-plans", athleteId] });
      qc.invalidateQueries({ queryKey: ["race-plan", athleteId, planId] });
      qc.invalidateQueries({ queryKey: ["race-timeline", athleteId, planId] });
    },
  });
}

export function useDeleteRacePlan(athleteId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) =>
      apiClient.delete(`/planning/${athleteId}/race-plans/${planId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["race-plans", athleteId] }),
  });
}

export function useCreateNutritionItem(athleteId: string | null, planId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { segmentType: string; timeOffsetMin: number; item: string; calories?: number; sodiumMg?: number; fluidMl?: number }) =>
      apiClient.post(`/planning/${athleteId}/race-plans/${planId}/nutrition`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["race-plan", athleteId, planId] });
      qc.invalidateQueries({ queryKey: ["race-timeline", athleteId, planId] });
    },
  });
}

export function useDeleteNutritionItem(athleteId: string | null, planId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiClient.delete(`/planning/${athleteId}/race-plans/${planId}/nutrition/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["race-plan", athleteId, planId] });
      qc.invalidateQueries({ queryKey: ["race-timeline", athleteId, planId] });
    },
  });
}
