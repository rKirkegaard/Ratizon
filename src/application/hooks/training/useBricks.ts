import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import type { SessionBrick, BrickTransition } from "@/domain/types/brick.types";

export function useBricks(
  athleteId: string | null,
  startDate?: string,
  endDate?: string
) {
  return useQuery<SessionBrick[]>({
    queryKey: ["bricks", athleteId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const qs = params.toString();
      const raw = await apiClient.get<SessionBrick[]>(
        `/training/bricks/${athleteId}${qs ? `?${qs}` : ""}`
      );
      return Array.isArray(raw) ? raw : [];
    },
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });
}

export function useBrickDetail(
  athleteId: string | null,
  brickId: string | null
) {
  return useQuery<SessionBrick>({
    queryKey: ["brick-detail", athleteId, brickId],
    queryFn: () =>
      apiClient.get<SessionBrick>(
        `/training/bricks/${athleteId}/${brickId}`
      ),
    enabled: !!athleteId && !!brickId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBrickTransition(
  athleteId: string | null,
  brickId: string | null
) {
  return useQuery<BrickTransition>({
    queryKey: ["brick-transition", athleteId, brickId],
    queryFn: () =>
      apiClient.get<BrickTransition>(
        `/training/bricks/${athleteId}/${brickId}/transition`
      ),
    enabled: !!athleteId && !!brickId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateBrick(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { sessionIds: string[]; title?: string }) =>
      apiClient.post(`/training/bricks/${athleteId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bricks", athleteId] });
    },
  });
}

export function useDetectBricks(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data?: { startDate?: string; endDate?: string }) =>
      apiClient.post<{ detected: number; created: number }>(
        `/training/bricks/${athleteId}/detect`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bricks", athleteId] });
    },
  });
}

export function useDeleteBrick(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (brickId: string) =>
      apiClient.delete(`/training/bricks/${athleteId}/${brickId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bricks", athleteId] });
    },
  });
}
