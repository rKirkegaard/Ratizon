import { StatCard } from "@/presentation/components/shared/StatCard";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { formatDistance, formatNumber, paceToMinKmString } from "@/domain/utils/formatters";
import type { Session } from "@/domain/types/training.types";

interface RunningMetricsProps {
  sessions: Session[];
}

export default function RunningMetrics({ sessions }: RunningMetricsProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const runColor = getSportColor("run");

  const totalDistanceM = sessions.reduce((sum, s) => sum + (s.distanceMeters ?? 0), 0);
  const totalTss = sessions.reduce((sum, s) => sum + (s.tss ?? 0), 0);
  const sessionsWithPace = sessions.filter((s) => s.avgPace && s.avgPace > 0);
  const avgPace =
    sessionsWithPace.length > 0
      ? sessionsWithPace.reduce((sum, s) => sum + s.avgPace!, 0) / sessionsWithPace.length
      : 0;
  const sessionsWithCadence = sessions.filter((s) => s.avgCadence && s.avgCadence > 0);
  const avgCadence =
    sessionsWithCadence.length > 0
      ? Math.round(
          sessionsWithCadence.reduce((sum, s) => sum + s.avgCadence!, 0) /
            sessionsWithCadence.length
        )
      : 0;

  return (
    <div data-testid="running-metrics" className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <StatCard
        label="Total distance"
        value={formatDistance(totalDistanceM, 1).replace(" km", "")}
        unit="km"
        accentColor={runColor}
      />
      <StatCard
        label="Gns. pace"
        value={avgPace > 0 ? paceToMinKmString(avgPace) : "-"}
        unit="min/km"
        accentColor={runColor}
      />
      <StatCard
        label="Gns. kadence"
        value={avgCadence > 0 ? formatNumber(avgCadence) : "-"}
        unit="spm"
        accentColor={runColor}
      />
      <StatCard
        label="Sessioner"
        value={formatNumber(sessions.length)}
        accentColor={runColor}
      />
      <StatCard
        label="Total TSS"
        value={formatNumber(Math.round(totalTss))}
        accentColor={runColor}
      />
    </div>
  );
}
