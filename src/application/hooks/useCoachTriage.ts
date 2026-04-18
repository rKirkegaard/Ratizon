import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../api/client";

export interface TriageCard {
  athleteId: string;
  name: string;
  sport: string | null;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  activeAlerts: number;
  criticalAlerts: number;
  lastSession: { date: string; sport: string; title: string } | null;
  daysSinceLastSession: number | null;
  sessionsLast7Days: number;
  priority: "critical" | "warning" | "ok";
}

export function useCoachTriage() {
  return useQuery({
    queryKey: ["coach-triage"],
    queryFn: () => apiClient.get("/coach/triage"),
    staleTime: 60 * 1000,
  });
}

export function useDraftMessage() {
  return useMutation({
    mutationFn: ({ athleteId, messageType, context }: { athleteId: string; messageType: string; context?: string }) =>
      apiClient.post(`/coach/draft-message/${athleteId}`, { messageType, context }),
  });
}
