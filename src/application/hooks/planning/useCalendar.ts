import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import type { Session, PlannedSession } from "@/domain/types/training.types";
import type { SessionBrick } from "@/domain/types/brick.types";

// ── Types ─────────────────────────────────────────────────────────────

export interface CalendarPhase {
  id: string;
  phaseName: string;
  phaseType: string;
  startDate: string;
  endDate: string;
  ctlTarget: number | null;
  weeklyHoursTarget: number | null;
}

export interface CalendarGoal {
  id: string;
  title: string;
  targetDate: string | null;
  racePriority: string | null;
  goalType: string;
  status: string;
  sport: string | null;
  raceDistance: number | null;
  raceTargetTime: number | null;
  swimTargetTime: number | null;
  bikeTargetTime: number | null;
  runTargetTime: number | null;
  t1TargetTime: number | null;
  t2TargetTime: number | null;
  notes: string | null;
}

export interface CalendarSession {
  type: "completed";
  data: Session;
}

export interface CalendarPlannedSession {
  type: "planned";
  data: PlannedSession;
}

export interface CalendarBrickEntry {
  type: "brick";
  data: SessionBrick;
}

export type CalendarEntry = CalendarSession | CalendarPlannedSession | CalendarBrickEntry;

// ── Main hook ─────────────────────────────────────────────────────────

export function useCalendarSessions(
  athleteId: string | null,
  startDate: string,
  endDate: string
) {
  // 1. Completed sessions
  const completedQuery = useQuery<Session[]>({
    queryKey: ["calendar-sessions", athleteId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate });
      const raw = await apiClient.get(
        `/training/sessions/${athleteId}?${params.toString()}`
      );
      return Array.isArray(raw) ? raw : (raw as any)?.data ?? [];
    },
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });

  // 2. Planned sessions
  const plannedQuery = useQuery<PlannedSession[]>({
    queryKey: ["calendar-planned", athleteId, startDate, endDate],
    queryFn: async () => {
      const raw = await apiClient.get(
        `/planning/${athleteId}/sessions?startDate=${startDate}&endDate=${endDate}`
      );
      return Array.isArray(raw) ? raw : (raw as any)?.data ?? [];
    },
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });

  // 3. Training phases
  const phasesQuery = useQuery<CalendarPhase[]>({
    queryKey: ["calendar-phases", athleteId],
    queryFn: async () => {
      const raw = await apiClient.get(`/planning/${athleteId}/phases`);
      return Array.isArray(raw) ? raw : (raw as any)?.data ?? [];
    },
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });

  // 4. Goals
  const goalsQuery = useQuery<CalendarGoal[]>({
    queryKey: ["calendar-goals", athleteId],
    queryFn: async () => {
      const raw = await apiClient.get(`/planning/${athleteId}/goals`);
      const arr = Array.isArray(raw) ? raw : (raw as any)?.data ?? [];
      return arr.filter((g: any) => g.status === "active");
    },
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });

  // 5. Bricks
  const bricksQuery = useQuery<SessionBrick[]>({
    queryKey: ["calendar-bricks", athleteId, startDate, endDate],
    queryFn: async () => {
      const raw = await apiClient.get(
        `/training/bricks/${athleteId}?startDate=${startDate}&endDate=${endDate}`
      );
      return Array.isArray(raw) ? raw : (raw as any)?.data ?? [];
    },
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });

  // 6. PMC for CTL delta
  const pmcQuery = useQuery<Array<{ date: string; ctl: number; atl: number; tsb: number }>>({
    queryKey: ["calendar-pmc", athleteId],
    queryFn: async () => {
      const raw = await apiClient.get(`/analytics/${athleteId}/pmc?days=90`);
      return Array.isArray(raw) ? raw : [];
    },
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });

  const completed = completedQuery.data ?? [];
  const planned = plannedQuery.data ?? [];
  const phases = phasesQuery.data ?? [];
  const goals = goalsQuery.data ?? [];
  const bricks = bricksQuery.data ?? [];
  const pmcPoints = pmcQuery.data ?? [];

  // Build set of session IDs that belong to bricks
  const brickSessionIds = new Set<string>();
  for (const brick of bricks) {
    for (const seg of brick.segments ?? []) {
      brickSessionIds.add(String(seg.sessionId));
    }
  }

  // Merge entries: completed (excluding brick members) + planned + bricks
  const all: CalendarEntry[] = [
    ...completed
      .filter((s) => !brickSessionIds.has(String(s.id)))
      .map((s): CalendarEntry => ({ type: "completed", data: s })),
    ...planned
      .filter((p) => !p.completedSessionId)
      .map((p): CalendarEntry => ({ type: "planned", data: p })),
    ...bricks.map((b): CalendarEntry => ({ type: "brick", data: b })),
  ];

  return {
    completed,
    planned,
    all,
    phases,
    goals,
    bricks,
    pmcPoints,
    isLoading: completedQuery.isLoading || plannedQuery.isLoading,
    isError: completedQuery.isError || plannedQuery.isError,
    error: completedQuery.error || plannedQuery.error,
  };
}

// ── Mutations ─────────────────────────────────────────────────────────

export function useMoveSession(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, newDate }: { sessionId: string; newDate: string }) =>
      apiClient.put(`/planning/${athleteId}/sessions/${sessionId}/move`, { scheduled_date: newDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-planned", athleteId] });
      queryClient.invalidateQueries({ queryKey: ["calendar-sessions", athleteId] });
    },
  });
}

export function useDeleteSession(athleteId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.delete(`/planning/${athleteId}/sessions/${sessionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-planned", athleteId] });
    },
  });
}
