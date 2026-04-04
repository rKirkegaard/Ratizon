import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import type { Session, PlannedSession } from "@/domain/types/training.types";

// ── Response types ─────────────────────────────────────────────────────

interface SessionsApiResponse {
  data: Session[];
}

interface PlannedSessionsApiResponse {
  data: PlannedSession[];
}

export interface CalendarSession {
  type: "completed";
  data: Session;
}

export interface CalendarPlannedSession {
  type: "planned";
  data: PlannedSession;
}

export type CalendarEntry = CalendarSession | CalendarPlannedSession;

export interface CalendarData {
  completed: Session[];
  planned: PlannedSession[];
  all: CalendarEntry[];
}

// ── Main hook: fetch both completed + planned sessions ─────────────────

export function useCalendarSessions(
  athleteId: string | null,
  startDate: string,
  endDate: string
) {
  const completedQuery = useQuery<SessionsApiResponse>({
    queryKey: ["calendar-sessions", athleteId, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams({ startDate, endDate });
      return apiClient.get<SessionsApiResponse>(
        `/training/sessions/${athleteId}?${params.toString()}`
      );
    },
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });

  const plannedQuery = useQuery<PlannedSessionsApiResponse>({
    queryKey: ["calendar-planned", athleteId, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams({ startDate, endDate });
      return apiClient.get<PlannedSessionsApiResponse>(
        `/planning/${athleteId}/sessions?${params.toString()}`
      );
    },
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });

  const completed = completedQuery.data?.data ?? [];
  const planned = plannedQuery.data?.data ?? [];

  const all: CalendarEntry[] = [
    ...completed.map((s): CalendarEntry => ({ type: "completed", data: s })),
    ...planned
      .filter((p) => !p.completedSessionId)
      .map((p): CalendarEntry => ({ type: "planned", data: p })),
  ];

  return {
    completed,
    planned,
    all,
    isLoading: completedQuery.isLoading || plannedQuery.isLoading,
    isError: completedQuery.isError || plannedQuery.isError,
    error: completedQuery.error || plannedQuery.error,
  };
}

// ── Move session mutation (drag-and-drop) ──────────────────────────────

export function useMoveSession(athleteId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      newDate,
    }: {
      sessionId: string;
      newDate: string;
    }) => {
      return apiClient.put(
        `/planning/${athleteId}/sessions/${sessionId}/move`,
        { scheduled_date: newDate }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-planned", athleteId] });
      queryClient.invalidateQueries({ queryKey: ["calendar-sessions", athleteId] });
    },
  });
}

// ── Delete session mutation ────────────────────────────────────────────

export function useDeleteSession(athleteId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      return apiClient.delete(`/planning/${athleteId}/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-planned", athleteId] });
    },
  });
}
