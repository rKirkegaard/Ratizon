import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";

// ── Response types ──────────────────────────────────────────────────────

export interface PowerCurvePoint {
  durationSec: number;
  durationLabel: string;
  current90d: number | null;
  allTimeBest: number | null;
}

export interface PowerCurveResponse {
  data: PowerCurvePoint[];
}

export interface CyclingZoneMonth {
  month: string;
  monthName: string;
  z1: number;
  z2: number;
  z3: number;
  z4: number;
  z5: number;
}

export interface CyclingZoneDistributionResponse {
  data: CyclingZoneMonth[];
}

export interface CadencePowerPoint {
  cadence: number;
  power: number;
  sessionId: string;
}

export interface CadencePowerResponse {
  data: CadencePowerPoint[];
}

// ── Hooks ───────────────────────────────────────────────────────────────

export function usePowerCurve(athleteId: string | null) {
  return useQuery<PowerCurveResponse>({
    queryKey: ["cycling-power-curve", athleteId],
    queryFn: () =>
      apiClient.get<PowerCurveResponse>(
        `/analytics/${athleteId}/cycling/power-curve`
      ),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCyclingZoneDistribution(athleteId: string | null, days: number) {
  return useQuery<CyclingZoneDistributionResponse>({
    queryKey: ["cycling-zone-distribution", athleteId, days],
    queryFn: () =>
      apiClient.get<CyclingZoneDistributionResponse>(
        `/analytics/${athleteId}/cycling/zone-distribution?days=${days}`
      ),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCadencePower(athleteId: string | null, days: number) {
  return useQuery<CadencePowerResponse>({
    queryKey: ["cycling-cadence-power", athleteId, days],
    queryFn: () =>
      apiClient.get<CadencePowerResponse>(
        `/analytics/${athleteId}/cycling/cadence-power?days=${days}`
      ),
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000,
  });
}
