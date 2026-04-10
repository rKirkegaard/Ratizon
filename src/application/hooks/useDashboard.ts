import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";

// ── Response types ──────────────────────────────────────────────────────

export interface WellnessData {
  logged_today: boolean;
  hrv: number | null;
  resting_hr: number | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  stress: number | null;
  body_battery: number | null;
  motivation: number | null;
  hrv_gate: "green" | "amber" | "red";
  hr_gate: "green" | "amber" | "red";
  sleep_gate: "green" | "amber" | "red";
  stress_gate: "green" | "amber" | "red";
}

export interface FitnessData {
  ctl: number;
  ctl_trend: number;
  atl: number;
  tsb: number;
  tsb_status: "green" | "amber" | "red";
  tsb_label: string;
}

export interface PlannedSession {
  id: string;
  sport: string;
  title: string;
  type: string;
  duration_seconds: number;
  purpose: string;
  date: string;
}

export interface CompletedSession {
  id: string;
  sport: string;
  type: string;
  title: string;
  duration_seconds: number;
  distance_meters: number | null;
  tss: number | null;
  quality: "good" | "moderate" | "poor" | null;
}

export interface WeekStatusData {
  tss_actual: number;
  tss_planned: number;
  sessions_completed: number;
  sessions_planned: number;
  compliance_pct: number;
  remaining_text: string;
}

export interface AlertItem {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  timestamp: string;
  has_more: boolean;
}

export interface MotivationData {
  streak_days: number;
  ctl_pct_of_target: number;
  race_name: string | null;
  race_days_remaining: number | null;
}

export interface MainGoalData {
  id: string;
  title: string;
  targetDate: string | null;
  sport: string | null;
  racePriority: string | null;
  goalType: string;
}

export interface DashboardResponse {
  wellness: WellnessData;
  fitness: FitnessData;
  todays_plan: PlannedSession[];
  yesterday_sessions: CompletedSession[];
  week_status: WeekStatusData;
  upcoming_sessions: PlannedSession[];
  alerts: AlertItem[];
  alerts_total: number;
  motivation: MotivationData;
  main_goal: MainGoalData | null;
  next_goal: MainGoalData | null;
}

// ── Wellness log payload ────────────────────────────────────────────────

export interface WellnessLogPayload {
  hrv: number;
  resting_hr: number;
  sleep_hours: number;
  sleep_quality: number;
  stress: number;
  body_battery: number;
  motivation: number;
}

// ── Map backend camelCase to frontend snake_case ────────────────────────

function mapTsbStatus(tsb: number): "green" | "amber" | "red" {
  if (tsb > 15) return "green";
  if (tsb >= -10) return "green";
  if (tsb >= -30) return "amber";
  return "red";
}

function mapTsbLabel(status: string): string {
  if (status === "fresh") return "Frisk";
  if (status === "neutral") return "Neutral";
  if (status === "fatigued") return "Traet";
  if (status === "overtrained") return "Overtrænet";
  return status;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBackendResponse(raw: any): DashboardResponse {
  const w = raw.wellness || {};
  const latestW = w.latest || {};
  const gate = w.gate || {};
  const f = raw.fitness || {};
  const ws = raw.weekStatus || {};

  return {
    wellness: {
      logged_today: !!latestW.date && new Date(latestW.date).toDateString() === new Date().toDateString(),
      hrv: latestW.hrvMssd ?? null,
      resting_hr: latestW.restingHr ?? null,
      sleep_hours: latestW.sleepHours ?? null,
      sleep_quality: latestW.sleepQuality ?? null,
      stress: latestW.stressLevel ?? null,
      body_battery: latestW.bodyBattery ?? null,
      motivation: latestW.motivationScore ?? null,
      hrv_gate: gate.gateStatus ?? "amber",
      hr_gate: "amber",
      sleep_gate: "amber",
      stress_gate: "amber",
    },
    fitness: {
      ctl: f.ctl ?? 0,
      ctl_trend: f.ctlTrend ?? 0,
      atl: f.atl ?? 0,
      tsb: f.tsb ?? 0,
      tsb_status: mapTsbStatus(f.tsb ?? 0),
      tsb_label: mapTsbLabel(f.tsbStatus ?? "unknown"),
    },
    todays_plan: (raw.todaysPlan || []).map((p: any) => ({
      id: p.id,
      sport: p.sport,
      title: p.title || "",
      type: p.purpose || "",
      duration_seconds: p.targetDuration ?? 0,
      purpose: p.purpose || p.description || "",
      date: new Date().toISOString(),
    })),
    yesterday_sessions: (raw.yesterday || []).map((s: any) => ({
      id: s.id,
      sport: s.sport,
      type: s.type || "",
      title: s.title || "",
      duration_seconds: s.duration ?? 0,
      distance_meters: s.distance ?? null,
      tss: s.tss ?? null,
      quality: s.sessionQuality ?? null,
    })),
    week_status: {
      tss_actual: ws.totalTss ?? 0,
      tss_planned: ws.plannedTss ?? 0,
      sessions_completed: ws.sessionCount ?? 0,
      sessions_planned: ws.sessionCount + (ws.plannedRemaining ?? 0),
      compliance_pct: ws.compliancePct ?? 0,
      remaining_text: ws.plannedRemaining ? `${ws.plannedRemaining} sessioner tilbage` : "Ingen planlagte",
    },
    upcoming_sessions: (raw.upcomingSessions || []).map((p: any) => ({
      id: p.id,
      sport: p.sport,
      title: p.title || "",
      type: p.purpose || "",
      duration_seconds: p.targetDuration ?? 0,
      purpose: p.purpose || "",
      date: p.scheduledDate || "",
    })),
    alerts: (raw.alerts || []).map((a: any) => ({
      id: a.id,
      severity: a.severity ?? "info",
      message: a.message || a.title || "",
      timestamp: a.createdAt || "",
      has_more: false,
    })),
    alerts_total: (raw.alerts || []).length,
    motivation: {
      streak_days: raw.motivation?.currentStreak ?? 0,
      ctl_pct_of_target: raw.motivation?.ctlPctOfTarget ?? 0,
      race_name: null,
      race_days_remaining: null,
    },
    main_goal: raw.mainGoal
      ? {
          id: raw.mainGoal.id,
          title: raw.mainGoal.title,
          targetDate: raw.mainGoal.targetDate ?? null,
          sport: raw.mainGoal.sport ?? null,
          racePriority: raw.mainGoal.racePriority ?? null,
          goalType: raw.mainGoal.goalType ?? "race",
        }
      : null,
    next_goal: raw.nextGoal
      ? {
          id: raw.nextGoal.id,
          title: raw.nextGoal.title,
          targetDate: raw.nextGoal.targetDate ?? null,
          sport: raw.nextGoal.sport ?? null,
          racePriority: raw.nextGoal.racePriority ?? null,
          goalType: raw.nextGoal.goalType ?? "race",
        }
      : null,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useDashboard(athleteId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery<DashboardResponse>({
    queryKey: ["dashboard", athleteId],
    queryFn: async () => {
      const raw = await apiClient.get(`/dashboard/${athleteId}`);
      return mapBackendResponse(raw);
    },
    enabled: !!athleteId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const wellnessMutation = useMutation({
    mutationFn: (payload: WellnessLogPayload) =>
      apiClient.post(`/wellness/${athleteId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", athleteId] });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    logWellness: wellnessMutation.mutate,
    isLoggingWellness: wellnessMutation.isPending,
    wellnessLogSuccess: wellnessMutation.isSuccess,
  };
}
