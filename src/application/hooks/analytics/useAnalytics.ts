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
    queryFn: () =>
      apiClient.get<WeeklyReportResponse>(
        `/analytics/${athleteId}/weekly?date=${date}`
      ),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePMC(athleteId: string | null, days: number) {
  return useQuery<PMCResponse>({
    queryKey: ["pmc", athleteId, days],
    queryFn: () =>
      apiClient.get<PMCResponse>(
        `/analytics/${athleteId}/pmc?days=${days}`
      ),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEFTrend(athleteId: string | null, days: number) {
  return useQuery<EFTrendResponse>({
    queryKey: ["ef-trend", athleteId, days],
    queryFn: () =>
      apiClient.get<EFTrendResponse>(
        `/analytics/${athleteId}/ef-trend?days=${days}`
      ),
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
    queryFn: () =>
      apiClient.get<PaceAtHRResponse>(
        `/analytics/${athleteId}/pace-at-hr?hrMin=${hrMin}&hrMax=${hrMax}`
      ),
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
    queryFn: () =>
      apiClient.get<PowerAtHRResponse>(
        `/analytics/${athleteId}/power-at-hr?hrMin=${hrMin}&hrMax=${hrMax}`
      ),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRampRate(athleteId: string | null, weeks: number) {
  return useQuery<RampRateResponse>({
    queryKey: ["ramp-rate", athleteId, weeks],
    queryFn: () =>
      apiClient.get<RampRateResponse>(
        `/analytics/${athleteId}/ramp-rate?weeks=${weeks}`
      ),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMonotony(athleteId: string | null, weeks: number) {
  return useQuery<MonotonyResponse>({
    queryKey: ["monotony", athleteId, weeks],
    queryFn: () =>
      apiClient.get<MonotonyResponse>(
        `/analytics/${athleteId}/monotony?weeks=${weeks}`
      ),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSportBalance(athleteId: string | null, weeks: number) {
  return useQuery<SportBalanceResponse>({
    queryKey: ["sport-balance", athleteId, weeks],
    queryFn: () =>
      apiClient.get<SportBalanceResponse>(
        `/analytics/${athleteId}/sport-balance?weeks=${weeks}`
      ),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}
