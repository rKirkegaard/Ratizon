import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export function useDailyBriefing(athleteId: string | null) {
  return useQuery({
    queryKey: ['ai-daily-briefing', athleteId],
    queryFn: () => apiClient.get(`/ai/${athleteId}/daily-briefing`),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGenerateBriefing(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post(`/ai/${athleteId}/daily-briefing/generate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-daily-briefing', athleteId] }),
  });
}

export function useSessionFeedback(athleteId: string | null, sessionId: number | null) {
  return useQuery({
    queryKey: ['ai-session-feedback', athleteId, sessionId],
    queryFn: () => apiClient.get(`/ai/${athleteId}/session-feedback/${sessionId}`),
    enabled: !!athleteId && !!sessionId,
  });
}

export function useGenerateSessionFeedback(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => apiClient.post(`/ai/${athleteId}/session-feedback/${sessionId}/generate`),
    onSuccess: (_, sessionId) => queryClient.invalidateQueries({ queryKey: ['ai-session-feedback', athleteId, sessionId] }),
  });
}

export function useAIAlerts(athleteId: string | null) {
  return useQuery({
    queryKey: ['ai-alerts', athleteId],
    queryFn: () => apiClient.get(`/ai/${athleteId}/alerts`),
    enabled: !!athleteId,
  });
}

export function useAIChat(athleteId: string | null) {
  return useMutation({
    mutationFn: (data: { message: string; contextPage?: string }) =>
      apiClient.post(`/ai/${athleteId}/chat`, data),
  });
}
