import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import type { GarminConnectionStatus } from "@/domain/types/garmin.types";

export function useGarminStatus(athleteId: string | null) {
  return useQuery<GarminConnectionStatus>({
    queryKey: ["garmin-status", athleteId],
    queryFn: () =>
      apiClient.get<GarminConnectionStatus>(`/garmin/status/${athleteId}`),
    enabled: !!athleteId,
    staleTime: 30 * 1000,
  });
}

export function useGarminConnect() {
  return useMutation({
    mutationFn: async () => {
      const result = await apiClient.get<{ authUrl: string }>("/garmin/connect");
      // Redirect user to Garmin SSO
      window.location.href = result.authUrl;
    },
  });
}

export function useGarminDisconnect(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post(`/garmin/disconnect/${athleteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["garmin-status", athleteId] });
    },
  });
}

export function useGarminSync(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<{
        activitiesReceived: number;
        activitiesImported: number;
        errors: string[] | null;
      }>(`/garmin/sync/${athleteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["garmin-status", athleteId] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-sessions"] });
    },
  });
}
