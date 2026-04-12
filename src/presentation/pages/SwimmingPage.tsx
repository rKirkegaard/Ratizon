import { useAthleteStore } from "@/application/stores/athleteStore";
import { useSessions } from "@/application/hooks/training/useSessions";
import {
  useSwimPaceProgression,
  useSwolfTrend,
} from "@/application/hooks/analytics/useSwimmingAnalytics";
import { StatCard } from "@/presentation/components/shared/StatCard";
import SwimPaceChart from "@/presentation/components/discipline/SwimPaceChart";
import SwolfTrendChart from "@/presentation/components/discipline/SwolfTrendChart";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { formatDistance, formatDuration, formatNumber, formatPacePer100m } from "@/domain/utils/formatters";
import { calcPacePer100m } from "@/domain/utils/paceUtils";

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
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="animate-pulse rounded-lg border border-border bg-card p-4">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="mt-3 h-8 w-16 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function SwimmingPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const swimColor = getSportColor("swim");

  const { data: sessionsData, isLoading: sessionsLoading } = useSessions(
    athleteId,
    "all",
    "swim"
  );
  const { data: paceData, isLoading: paceLoading } = useSwimPaceProgression(athleteId);
  const { data: swolfData, isLoading: swolfLoading } = useSwolfTrend(athleteId);

  if (!athleteId) {
    return (
      <div data-testid="swimming-page" className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            Vaelg en atlet for at se svommedata.
          </p>
        </div>
      </div>
    );
  }

  const swimSessions = sessionsData?.sessions ?? [];

  // Compute stat values
  const totalDistanceM = swimSessions.reduce((sum, s) => sum + (s.distanceMeters ?? 0), 0);
  const totalDurationSec = swimSessions.reduce((sum, s) => sum + s.durationSeconds, 0);

  // Average pace in seconds per 100m — compute from distance and duration
  const sessionsWithDist = swimSessions.filter(
    (s) => s.distanceMeters && s.distanceMeters > 0 && s.durationSeconds > 0
  );
  let avgPacePer100m = 0;
  if (sessionsWithDist.length > 0) {
    const totalPace = sessionsWithDist.reduce((sum, s) => {
      return sum + calcPacePer100m(s.durationSeconds, s.distanceMeters!);
    }, 0);
    avgPacePer100m = totalPace / sessionsWithDist.length;
  }

  return (
    <div data-testid="swimming-page" className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SportIcon sport="swim" size={28} />
        <h1 className="text-2xl font-bold text-foreground">Svomning</h1>
      </div>

      {/* Stat Cards */}
      {sessionsLoading ? (
        <MetricsSkeleton />
      ) : (
        <div data-testid="swimming-metrics" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total distance"
            value={totalDistanceM >= 1000
              ? formatDistance(totalDistanceM, 1).replace(" km", "")
              : formatNumber(totalDistanceM)
            }
            unit={totalDistanceM >= 1000 ? "km" : "m"}
            accentColor={swimColor}
          />
          <StatCard
            label="Gns. pace"
            value={avgPacePer100m > 0 ? formatPacePer100m(avgPacePer100m).replace("/100m", "") : "-"}
            unit="/100m"
            accentColor={swimColor}
          />
          <StatCard
            label="Sessioner"
            value={formatNumber(swimSessions.length)}
            accentColor={swimColor}
          />
          <StatCard
            label="Total tid"
            value={formatDuration(totalDurationSec)}
            accentColor={swimColor}
          />
        </div>
      )}

      {/* Pace Progression */}
      {paceLoading ? (
        <ChartSkeleton />
      ) : paceData ? (
        <SwimPaceChart data={Array.isArray(paceData) ? paceData : paceData.data ?? []} />
      ) : null}

      {/* SWOLF Trend */}
      {swolfLoading ? (
        <ChartSkeleton />
      ) : swolfData ? (
        <SwolfTrendChart data={Array.isArray(swolfData) ? swolfData : swolfData.data ?? []} />
      ) : null}
    </div>
  );
}
