import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";

export interface PhaseCTLTarget {
  phaseId: string;
  phaseType: string;
  ctlTarget: number;
  weeklyTSSTarget: number;
}

export interface RaceTSSEstimate {
  swimTSS: number;
  bikeTSS: number;
  runTSS: number;
  totalTSS: number;
  swimIF: number;
  bikeIF: number;
  runIF: number;
}

export interface DerivedThresholds {
  requiredFtp: number;
  requiredRunThresholdPaceSec: number;
  requiredSwimCssSec: number;
}

export interface CTLEstimateData {
  requiredCTL: number;
  ctlRange: { min: number; max: number };
  raceTSS: RaceTSSEstimate;
  derivedThresholds: DerivedThresholds;
  completionFactor: number;
  confidence: "high" | "moderate" | "low";
  warnings: string[];
  phaseTargets: PhaseCTLTarget[];
  weeklyTSSNeeded: number;
  requiredRampRate: number;
  currentCTL: number;
  ctlGap: number;
  weeksToRace: number;
  goalTitle: string;
  raceType: string;
}

export function useCTLEstimate(
  athleteId: string | null,
  goalId: string | null,
) {
  return useQuery<CTLEstimateData>({
    queryKey: ["ctl-estimate", athleteId, goalId],
    queryFn: () =>
      apiClient.post<CTLEstimateData>(
        `/planning/${athleteId}/ctl-estimate`,
        { goalId },
      ),
    enabled: !!athleteId && !!goalId,
    staleTime: 5 * 60 * 1000,
  });
}
