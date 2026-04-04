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

// ── Hook ────────────────────────────────────────────────────────────────

export function useDashboard(athleteId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery<DashboardResponse>({
    queryKey: ["dashboard", athleteId],
    queryFn: () => apiClient.get<DashboardResponse>(`/dashboard/${athleteId}`),
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
