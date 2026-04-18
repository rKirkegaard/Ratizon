import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export function useDailyBriefing(athleteId: string | null) {
  return useQuery({
    queryKey: ['ai-daily-briefing', athleteId],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/daily-briefing`),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGenerateBriefing(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post(`/ai-coaching/${athleteId}/daily-briefing/generate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-daily-briefing', athleteId] }),
  });
}

export function useSessionFeedback(athleteId: string | null, sessionId: number | null) {
  return useQuery({
    queryKey: ['ai-session-feedback', athleteId, sessionId],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/session-feedback/${sessionId}`),
    enabled: !!athleteId && !!sessionId,
  });
}

export function useGenerateSessionFeedback(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) => apiClient.post(`/ai-coaching/${athleteId}/session-feedback/${sessionId}/generate`),
    onSuccess: (_, sessionId) => queryClient.invalidateQueries({ queryKey: ['ai-session-feedback', athleteId, sessionId] }),
  });
}

export function useAIAlerts(athleteId: string | null) {
  return useQuery({
    queryKey: ['ai-alerts', athleteId],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/alerts`),
    enabled: !!athleteId,
  });
}

// ── Coaching Preferences ──────────────────────────────────────────────

export function useCoachingPreferences(athleteId: string | null) {
  return useQuery({
    queryKey: ['ai-coaching-preferences', athleteId],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/preferences`),
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });
}

export function useUpdateCoachingPreferences(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.put(`/ai-coaching/${athleteId}/preferences`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-coaching-preferences', athleteId] }),
  });
}

// ── Alert Rules ──────────────────────────────────────────────────────

export function useAlertRules(athleteId: string | null) {
  return useQuery({
    queryKey: ['ai-alert-rules', athleteId],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/alert-rules`),
    enabled: !!athleteId,
  });
}

export function useCreateAlertRule(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post(`/ai-coaching/${athleteId}/alert-rules`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-alert-rules', athleteId] }),
  });
}

export function useUpdateAlertRule(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, ...data }: { ruleId: string } & Record<string, unknown>) =>
      apiClient.put(`/ai-coaching/${athleteId}/alert-rules/${ruleId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-alert-rules', athleteId] }),
  });
}

export function useDeleteAlertRule(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) =>
      apiClient.delete(`/ai-coaching/${athleteId}/alert-rules/${ruleId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-alert-rules', athleteId] }),
  });
}

// ── Weekly Summary ───────────────────────────────────────────────────

export function useWeeklySummary(athleteId: string | null, weekDate: string | null) {
  return useQuery({
    queryKey: ['ai-weekly-summary', athleteId, weekDate],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/weekly-summary?week=${weekDate}`),
    enabled: !!athleteId && !!weekDate,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGenerateWeeklySummary(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weekDate: string) =>
      apiClient.post(`/ai-coaching/${athleteId}/weekly-summary/generate?week=${weekDate}`),
    onSuccess: (_, weekDate) =>
      queryClient.invalidateQueries({ queryKey: ['ai-weekly-summary', athleteId, weekDate] }),
  });
}

// ── Monthly Summary ──────────────────────────────────────────────────

export function useMonthlySummary(athleteId: string | null, year: number | null, month: number | null) {
  return useQuery({
    queryKey: ['ai-monthly-summary', athleteId, year, month],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/monthly-summary?year=${year}&month=${month}`),
    enabled: !!athleteId && !!year && !!month,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGenerateMonthlySummary(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      apiClient.post(`/ai-coaching/${athleteId}/monthly-summary/generate?year=${year}&month=${month}`),
    onSuccess: (_, { year, month }) =>
      queryClient.invalidateQueries({ queryKey: ['ai-monthly-summary', athleteId, year, month] }),
  });
}

// ── Alert Acknowledge ────────────────────────────────────────────────

export function useAcknowledgeAlert(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) =>
      apiClient.patch(`/ai-coaching/${athleteId}/alerts/${alertId}/acknowledge`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-alerts', athleteId] }),
  });
}

// ── Coach Notes ──────────────────────────────────────────────────────

export function useCoachNotes(athleteId: string | null, sessionId?: number | null) {
  const params = sessionId ? `?sessionId=${sessionId}` : '';
  return useQuery({
    queryKey: ['coach-notes', athleteId, sessionId],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/coach-notes${params}`),
    enabled: !!athleteId,
  });
}

export function useCreateCoachNote(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; sessionId?: number; visibility?: string }) =>
      apiClient.post(`/ai-coaching/${athleteId}/coach-notes`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coach-notes', athleteId] }),
  });
}

export function useUpdateCoachNote(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, ...data }: { noteId: string; content?: string; visibility?: string }) =>
      apiClient.put(`/ai-coaching/${athleteId}/coach-notes/${noteId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coach-notes', athleteId] }),
  });
}

export function useDeleteCoachNote(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      apiClient.delete(`/ai-coaching/${athleteId}/coach-notes/${noteId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coach-notes', athleteId] }),
  });
}

export function useAIChat(athleteId: string | null) {
  return useMutation({
    mutationFn: (data: { message: string; contextPage?: string }) =>
      apiClient.post(`/ai-coaching/${athleteId}/chat`, data),
  });
}

// ── Suggestions ─────────────────────────────────────────────────────

export function useSuggestions(athleteId: string | null) {
  return useQuery({
    queryKey: ['ai-suggestions', athleteId],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/suggestions`),
    enabled: !!athleteId,
  });
}

export function useLogSuggestionFeedback(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ suggestionId, accepted, feedback }: { suggestionId: string; accepted?: boolean; feedback?: string }) =>
      apiClient.post(`/ai-coaching/${athleteId}/suggestions/${suggestionId}/feedback`, { accepted, feedback }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-suggestions', athleteId] }),
  });
}

// ── AI Plan Parsing ─────────────────────────────────────────────────

export function useParsePlan(athleteId: string | null) {
  return useMutation({
    mutationFn: (text: string) =>
      apiClient.post(`/ai-coaching/${athleteId}/parse-plan`, { text }),
  });
}

export function useImportParsedPlan(athleteId: string | null) {
  return useMutation({
    mutationFn: (sessions: any[]) =>
      apiClient.post(`/ai-coaching/${athleteId}/import-plan`, { sessions }),
  });
}

// ── Evaluate Alerts ─────────────────────────────────────────────────

export function useSessionDeepAnalytics(athleteId: string | null, sessionId: number | null) {
  return useQuery({
    queryKey: ['ai-session-analytics', athleteId, sessionId],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/session-analytics/${sessionId}`),
    enabled: !!athleteId && !!sessionId,
  });
}

export function useEvaluateAlerts(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post(`/ai-coaching/${athleteId}/alerts/evaluate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-alerts', athleteId] }),
  });
}
