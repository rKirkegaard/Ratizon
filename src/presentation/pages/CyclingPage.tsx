import { useState } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useSessions } from "@/application/hooks/training/useSessions";
import {
  usePowerCurve,
  useCyclingZoneDistribution,
  useCadencePower,
} from "@/application/hooks/analytics/useCyclingAnalytics";
import { StatCard } from "@/presentation/components/shared/StatCard";
import PowerCurveChart from "@/presentation/components/discipline/PowerCurveChart";
import FTPProgression from "@/presentation/components/discipline/FTPProgression";
import CyclingZoneChart from "@/presentation/components/discipline/CyclingZoneChart";
import CadencePowerScatter from "@/presentation/components/discipline/CadencePowerScatter";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { formatDistance, formatDuration, formatNumber } from "@/domain/utils/formatters";

type PeriodOption = { days: number; range: "30d" | "90d" | "all"; label: string };

const PERIODS: PeriodOption[] = [
  { days: 30, range: "30d", label: "30d" },
  { days: 90, range: "90d", label: "90d" },
  { days: 9999, range: "all", label: "Al tid" },
];

function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={`animate-pulse rounded-lg border border-border bg-card p-4 ${height}`}>
      <div className="h-3 w-40 rounded bg-muted" />
      <div className="mt-4 h-full rounded bg-muted/30" />
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="animate-pulse rounded-lg border border-border bg-card p-4">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="mt-3 h-8 w-16 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function CyclingPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const bikeColor = getSportColor("bike");

  const [period, setPeriod] = useState<PeriodOption>(PERIODS[1]); // default 90d

  const { data: sessionsData, isLoading: sessionsLoading } = useSessions(
    athleteId,
    period.range,
    "bike"
  );
  const { data: powerCurveData, isLoading: pcLoading } = usePowerCurve(athleteId);
  const { data: zoneData, isLoading: zoneLoading } = useCyclingZoneDistribution(
    athleteId,
    period.days
  );
  const { data: cadencePowerData, isLoading: cpLoading } = useCadencePower(
    athleteId,
    period.days
  );

  if (!athleteId) {
    return (
      <div data-testid="cycling-page" className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            Vaelg en atlet for at se cykeldata.
          </p>
        </div>
      </div>
    );
  }

  const bikeSessions = sessionsData?.sessions ?? [];

  // Compute stat card values
  const totalDistanceM = bikeSessions.reduce((sum, s) => sum + (s.distanceMeters ?? 0), 0);
  const totalDurationSec = bikeSessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const sessionsWithPower = bikeSessions.filter((s) => s.avgPower && s.avgPower > 0);
  const avgPower =
    sessionsWithPower.length > 0
      ? Math.round(
          sessionsWithPower.reduce((sum, s) => sum + s.avgPower!, 0) /
            sessionsWithPower.length
        )
      : 0;
  const totalElevation = bikeSessions.reduce((sum, s) => sum + (s.elevationGain ?? 0), 0);

  return (
    <div data-testid="cycling-page" className="space-y-6 p-4 md:p-6">
      {/* Header + period selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <SportIcon sport="bike" size={28} />
          <h1 className="text-2xl font-bold text-foreground">Cykling</h1>
        </div>

        <div data-testid="period-selector" className="flex gap-1 rounded-lg bg-muted/50 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              data-testid={`period-${p.range}`}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period.days === p.days
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      {sessionsLoading ? (
        <MetricsSkeleton />
      ) : (
        <div data-testid="cycling-metrics" className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label="Total distance"
            value={formatDistance(totalDistanceM, 0).replace(" km", "")}
            unit="km"
            accentColor={bikeColor}
          />
          <StatCard
            label="Gns. effekt"
            value={avgPower > 0 ? formatNumber(avgPower) : "-"}
            unit="W"
            accentColor={bikeColor}
          />
          <StatCard
            label="Total tid"
            value={formatDuration(totalDurationSec)}
            accentColor={bikeColor}
          />
          <StatCard
            label="Sessioner"
            value={formatNumber(bikeSessions.length)}
            accentColor={bikeColor}
          />
          <StatCard
            label="Hojdemeter"
            value={formatNumber(totalElevation)}
            unit="m"
            accentColor={bikeColor}
          />
        </div>
      )}

      {/* Power Curve - full width */}
      {pcLoading ? (
        <ChartSkeleton height="h-72" />
      ) : powerCurveData ? (
        <PowerCurveChart data={Array.isArray(powerCurveData) ? powerCurveData : powerCurveData.data ?? []} />
      ) : null}

      {/* FTP Progression + Zone Distribution side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        {pcLoading ? (
          <ChartSkeleton />
        ) : powerCurveData ? (
          <FTPProgression powerCurveData={Array.isArray(powerCurveData) ? powerCurveData : powerCurveData.data ?? []} />
        ) : null}

        {zoneLoading ? (
          <ChartSkeleton />
        ) : zoneData ? (
          <CyclingZoneChart data={Array.isArray(zoneData) ? zoneData : zoneData.data ?? []} />
        ) : null}
      </div>

      {/* Cadence vs Power scatter */}
      {cpLoading ? (
        <ChartSkeleton />
      ) : cadencePowerData ? (
        <CadencePowerScatter data={Array.isArray(cadencePowerData) ? cadencePowerData : cadencePowerData.data ?? []} />
      ) : null}
    </div>
  );
}
