import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import type { Goal, AthleteTrainingPhase } from "@/domain/types/planning.types";

// ── Response types ─────────────────────────────────────────────────────

interface GoalsResponse {
  data: Goal[];
}

interface GoalResponse {
  data: Goal;
}

interface PhasesResponse {
  data: AthleteTrainingPhase[];
}

interface PhaseResponse {
  data: AthleteTrainingPhase;
}

// ── Goals hooks ────────────────────────────────────────────────────────

export function useGoals(athleteId: string | null) {
  return useQuery<GoalsResponse>({
    queryKey: ["goals", athleteId],
    queryFn: () => apiClient.get<GoalsResponse>(`/planning/${athleteId}/goals`),
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });
}

export function useCreateGoal(athleteId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<GoalResponse, Error, Partial<Goal>>({
    mutationFn: (body) =>
      apiClient.post<GoalResponse>(`/planning/${athleteId}/goals`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", athleteId] });
    },
  });
}

export function useUpdateGoal(athleteId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<GoalResponse, Error, { id: string } & Partial<Goal>>({
    mutationFn: ({ id, ...body }) =>
      apiClient.put<GoalResponse>(`/planning/${athleteId}/goals/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", athleteId] });
    },
  });
}

export function useDeleteGoal(athleteId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (goalId) =>
      apiClient.delete(`/planning/${athleteId}/goals/${goalId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals", athleteId] });
    },
  });
}

// ── Phases hooks ───────────────────────────────────────────────────────

export function usePhases(athleteId: string | null) {
  return useQuery<PhasesResponse>({
    queryKey: ["phases", athleteId],
    queryFn: () => apiClient.get<PhasesResponse>(`/planning/${athleteId}/phases`),
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });
}

export function useCreatePhase(athleteId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<PhaseResponse, Error, Partial<AthleteTrainingPhase>>({
    mutationFn: (body) =>
      apiClient.post<PhaseResponse>(`/planning/${athleteId}/phases`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phases", athleteId] });
    },
  });
}
