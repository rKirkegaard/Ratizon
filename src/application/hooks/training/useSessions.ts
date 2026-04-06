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
    queryFn: async () => {
      const params = new URLSearchParams();
      const { startDate, endDate } = rangeToParams(range);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (sport && sport !== "all") params.set("sport", sport);
      const qs = params.toString();
      const raw = await apiClient.get<Session[] | SessionsResponse>(
        `/training/sessions/${athleteId}${qs ? `?${qs}` : ""}`
      );
      // Backend returns array, wrap in expected shape
      if (Array.isArray(raw)) {
        return { sessions: raw, total: raw.length };
      }
      return raw as SessionsResponse;
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
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = await apiClient.get(
        `/training/sessions/${athleteId}/${sessionId}`
      );
      // Backend returns flat object with analytics/laps embedded
      if (raw && !raw.session) {
        const { analytics, laps, ...session } = raw;
        return { session, analytics: analytics || null, laps: laps || [] };
      }
      return raw as SessionDetailResponse;
    },
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
    queryFn: async () => {
      const raw: any = await apiClient.get(
        `/training/sessions/${athleteId}/${sessionId}/timeseries?downsample=500`
      );
      // Backend returns { data: [...], totalPoints: N } — apiClient may not unwrap (2 keys)
      if (Array.isArray(raw)) return { points: raw };
      if (raw?.data && Array.isArray(raw.data)) return { points: raw.data };
      if (raw?.points && Array.isArray(raw.points)) return raw as SessionTimeSeriesResponse;
      return { points: [] };
    },
    enabled: !!athleteId && !!sessionId,
    staleTime: 10 * 60 * 1000,
  });
}
