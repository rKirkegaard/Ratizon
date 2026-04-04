import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import type { Session, SessionLap } from "@/domain/types/training.types";
import type { SessionAnalytics } from "@/domain/types/analytics.types";

// ── Response types ──────────────────────────────────────────────────────

export interface SessionsResponse {
  sessions: Session[];
  total: number;
}

export interface SessionDetailResponse {
  session: Session;
  analytics: SessionAnalytics | null;
  laps: SessionLap[];
}

export interface TimeSeriesPoint {
  timestamp: string;
  hr: number | null;
  power: number | null;
  cadence: number | null;
  speed: number | null;
  altitude: number | null;
}

export interface SessionTimeSeriesResponse {
  points: TimeSeriesPoint[];
}

// ── Range helpers ───────────────────────────────────────────────────────

export type SessionRange = "30d" | "90d" | "all";

function rangeToParams(range: SessionRange): { startDate?: string; endDate?: string } {
  if (range === "all") return {};
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  const days = range === "30d" ? 30 : 90;
  const start = new Date(now.getTime() - days * 86400000);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end,
  };
}

// ── Hooks ───────────────────────────────────────────────────────────────

export function useSessions(
  athleteId: string | null,
  range: SessionRange = "30d",
  sport?: string
) {
  return useQuery<SessionsResponse>({
    queryKey: ["sessions", athleteId, range, sport],
    queryFn: () => {
      const params = new URLSearchParams();
      const { startDate, endDate } = rangeToParams(range);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (sport && sport !== "all") params.set("sport", sport);
      const qs = params.toString();
      return apiClient.get<SessionsResponse>(
        `/sessions/${athleteId}${qs ? `?${qs}` : ""}`
      );
    },
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });
}

export function useSessionDetail(
  athleteId: string | null,
  sessionId: string | null
) {
  return useQuery<SessionDetailResponse>({
    queryKey: ["session-detail", athleteId, sessionId],
    queryFn: () =>
      apiClient.get<SessionDetailResponse>(
        `/sessions/${athleteId}/${sessionId}`
      ),
    enabled: !!athleteId && !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSessionTimeSeries(
  athleteId: string | null,
  sessionId: string | null
) {
  return useQuery<SessionTimeSeriesResponse>({
    queryKey: ["session-timeseries", athleteId, sessionId],
    queryFn: () =>
      apiClient.get<SessionTimeSeriesResponse>(
        `/sessions/${athleteId}/${sessionId}/timeseries?downsample=500`
      ),
    enabled: !!athleteId && !!sessionId,
    staleTime: 10 * 60 * 1000,
  });
}
