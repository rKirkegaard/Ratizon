import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";

// ── Response types ──────────────────────────────────────────────────────

export interface WeeklyReportSession {
  id: string;
  sport: string;
  sessionType: string;
  title: string;
  startedAt: string;
  durationSeconds: number;
  distanceMeters: number | null;
  avgHr: number | null;
  tss: number | null;
}

export interface WeeklyReportZone {
  zone: number;
  pct: number;
}

export interface WeeklyReportDiscipline {
  sport: string;
  durationSeconds: number;
  tss: number;
  sessions: number;
  zones: WeeklyReportZone[];
}

export interface WeeklyReportResponse {
  weekNumber: number;
  startDate: string;
  endDate: string;
  totalTss: number;
  totalDurationSeconds: number;
  totalSessions: number;
  compliancePct: number;
  ctlDelta: number;
  disciplines: WeeklyReportDiscipline[];
  zones: WeeklyReportZone[];
  sessions: WeeklyReportSession[];
}

export interface PMCPoint {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  tss: number;
}

export interface PMCResponse {
  points: PMCPoint[];
}

export interface EFPoint {
  date: string;
  ef: number;
  sport: string;
}

export interface EFTrendResponse {
  points: EFPoint[];
  trendLine: { date: string; ef: number }[];
}

export interface PaceAtHRPoint {
  date: string;
  paceSecondsPerKm: number;
  avgHr: number;
}

export interface PaceAtHRResponse {
  points: PaceAtHRPoint[];
  trendLine: { date: string; paceSecondsPerKm: number }[];
}

export interface PowerAtHRPoint {
  date: string;
  avgPower: number;
  avgHr: number;
}

export interface PowerAtHRResponse {
  points: PowerAtHRPoint[];
  trendLine: { date: string; avgPower: number }[];
}

export interface RampRatePoint {
  weekLabel: string;
  startDate: string;
  rampRatePct: number;
  weeklyTss: number;
}

export interface RampRateResponse {
  points: RampRatePoint[];
}

export interface MonotonyPoint {
  weekLabel: string;
  startDate: string;
  monotony: number;
  strain: number;
}

export interface MonotonyResponse {
  points: MonotonyPoint[];
}

export interface SportBalancePoint {
  weekLabel: string;
  startDate: string;
  [sport: string]: string | number;
}

export interface SportBalanceResponse {
  points: SportBalancePoint[];
  sports: string[];
}

// ── Hooks ───────────────────────────────────────────────────────────────

export function useWeeklyReport(athleteId: string | null, date: string) {
  return useQuery<WeeklyReportResponse>({
    queryKey: ["weekly-report", athleteId, date],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = await apiClient.get(
        `/analytics/${athleteId}/weekly?date=${date}`
      );
      // Map backend shape to frontend expected shape
      const summary = raw.summary || {};
      const pmc = raw.pmc || {};
      const disciplineBalance = raw.disciplineBalance || [];
      const zoneDist = raw.zoneDistribution || {};
      return {
        weekNumber: 0,
        startDate: raw.weekStart || "",
        endDate: raw.weekEnd || "",
        totalTss: summary.totalTss ?? 0,
        totalDurationSeconds: summary.totalDurationSec ?? 0,
        totalSessions: summary.sessionCount ?? 0,
        compliancePct: summary.compliancePct ?? 0,
        ctlDelta: pmc.ctlChange7d ?? 0,
        disciplines: disciplineBalance.map((d: any) => ({
          sport: d.sport,
          durationSeconds: d.duration ?? 0,
          tss: d.tss ?? 0,
          sessions: d.sessions ?? 0,
          zones: [],
        })),
        zones: [1, 2, 3, 4, 5].map((z) => ({
          zone: z,
          pct: zoneDist[`zone${z}Pct`] ?? 0,
        })),
        sessions: (raw.sessions || []).map((s: any) => ({
          id: String(s.id),
          sport: s.sport,
          sessionType: s.title || "",
          title: s.title || "",
          startedAt: s.date || "",
          durationSeconds: s.durationSec ?? (s.durationMin ? s.durationMin * 60 : 0),
          distanceMeters: s.distanceM ?? null,
          avgHr: s.avgHr ?? null,
          tss: s.tss ?? null,
        })),
      };
    },
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePMC(athleteId: string | null, days: number) {
  return useQuery<PMCResponse>({
    queryKey: ["pmc", athleteId, days],
    queryFn: async () => {
      const raw = await apiClient.get<PMCPoint[]>(
        `/analytics/${athleteId}/pmc?days=${days}`
      );
      return { points: Array.isArray(raw) ? raw : [] };
    },
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEFTrend(athleteId: string | null, days: number) {
  return useQuery<EFTrendResponse>({
    queryKey: ["ef-trend", athleteId, days],
    queryFn: async () => {
      const raw = await apiClient.get<EFPoint[]>(
        `/analytics/${athleteId}/ef-trend?days=${days}`
      );
      const points = Array.isArray(raw) ? raw : [];
      return { points, trendLine: [] };
    },
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePaceAtHR(
  athleteId: string | null,
  hrMin: number,
  hrMax: number
) {
  return useQuery<PaceAtHRResponse>({
    queryKey: ["pace-at-hr", athleteId, hrMin, hrMax],
    queryFn: async () => {
      const raw = await apiClient.get<PaceAtHRPoint[]>(
        `/analytics/${athleteId}/pace-at-hr?hrMin=${hrMin}&hrMax=${hrMax}`
      );
      const points = Array.isArray(raw) ? raw : [];
      return { points, trendLine: [] };
    },
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePowerAtHR(
  athleteId: string | null,
  hrMin: number,
  hrMax: number
) {
  return useQuery<PowerAtHRResponse>({
    queryKey: ["power-at-hr", athleteId, hrMin, hrMax],
    queryFn: async () => {
      const raw = await apiClient.get<PowerAtHRPoint[]>(
        `/analytics/${athleteId}/power-at-hr?hrMin=${hrMin}&hrMax=${hrMax}`
      );
      const points = Array.isArray(raw) ? raw : [];
      return { points, trendLine: [] };
    },
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRampRate(athleteId: string | null, weeks: number) {
  return useQuery<RampRateResponse>({
    queryKey: ["ramp-rate", athleteId, weeks],
    queryFn: async () => {
      const raw = await apiClient.get<RampRatePoint[]>(
        `/analytics/${athleteId}/ramp-rate?weeks=${weeks}`
      );
      return { points: Array.isArray(raw) ? raw : [] };
    },
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMonotony(athleteId: string | null, weeks: number) {
  return useQuery<MonotonyResponse>({
    queryKey: ["monotony", athleteId, weeks],
    queryFn: async () => {
      const raw = await apiClient.get<MonotonyPoint[]>(
        `/analytics/${athleteId}/monotony?weeks=${weeks}`
      );
      return { points: Array.isArray(raw) ? raw : [] };
    },
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSportBalance(athleteId: string | null, weeks: number) {
  return useQuery<SportBalanceResponse>({
    queryKey: ["sport-balance", athleteId, weeks],
    queryFn: async () => {
      const raw = await apiClient.get<SportBalancePoint[]>(
        `/analytics/${athleteId}/sport-balance?weeks=${weeks}`
      );
      const points = Array.isArray(raw) ? raw : [];
      const sportSet = new Set<string>();
      for (const p of points) {
        for (const key of Object.keys(p)) {
          if (key !== "weekLabel" && key !== "startDate" && key !== "weekNum" && key !== "weekStart") {
            sportSet.add(key);
          }
        }
      }
      return { points, sports: Array.from(sportSet) };
    },
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}
