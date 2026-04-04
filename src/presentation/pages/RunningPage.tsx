import { useState } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useSessions } from "@/application/hooks/training/useSessions";
import {
  useCadenceDistribution,
  useGCTBalance,
  useVerticalRatio,
} from "@/application/hooks/analytics/useRunningAnalytics";
import RunningMetrics from "@/presentation/components/discipline/RunningMetrics";
import CadenceHistogram from "@/presentation/components/discipline/CadenceHistogram";
import PaceTrend from "@/presentation/components/discipline/PaceTrend";
import GCTChart from "@/presentation/components/discipline/GCTChart";
import VerticalOscillationChart from "@/presentation/components/discipline/VerticalOscillationChart";
import { SportIcon } from "@/presentation/components/shared/SportIcon";

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

export default function RunningPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const [period, setPeriod] = useState<PeriodOption>(PERIODS[1]); // default 90d

  const { data: sessionsData, isLoading: sessionsLoading } = useSessions(
    athleteId,
    period.range,
    "run"
  );
  const { data: cadenceData, isLoading: cadenceLoading } = useCadenceDistribution(
    athleteId,
    period.days
  );
  const { data: gctData, isLoading: gctLoading } = useGCTBalance(athleteId, period.days);
  const { data: voData, isLoading: voLoading } = useVerticalRatio(athleteId, period.days);

  if (!athleteId) {
    return (
      <div data-testid="running-page" className="mx-auto max-w-5xl p-4 md:p-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            Vaelg en atlet for at se lobedata.
          </p>
        </div>
      </div>
    );
  }

  const runningSessions = sessionsData?.sessions ?? [];

  // Build pace trend data from sessions
  const paceTrendData = runningSessions
    .filter((s) => s.avgPace && s.avgPace > 0 && s.avgPace < 900)
    .map((s) => ({
      date: s.startedAt,
      sessionId: s.id,
      avgPace: s.avgPace!,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div data-testid="running-page" className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header + period selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <SportIcon sport="run" size={28} />
          <h1 className="text-2xl font-bold text-foreground">Lob</h1>
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

      {/* Metrics */}
      {sessionsLoading ? (
        <MetricsSkeleton />
      ) : (
        <RunningMetrics sessions={runningSessions} />
      )}

      {/* Cadence histogram */}
      {cadenceLoading ? (
        <ChartSkeleton />
      ) : cadenceData ? (
        <CadenceHistogram data={cadenceData.data} />
      ) : null}

      {/* Pace trend */}
      {sessionsLoading ? (
        <ChartSkeleton />
      ) : (
        <PaceTrend data={paceTrendData} />
      )}

      {/* GCT + VO side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        {gctLoading ? (
          <ChartSkeleton />
        ) : gctData ? (
          <GCTChart data={gctData.data} />
        ) : null}

        {voLoading ? (
          <ChartSkeleton />
        ) : voData ? (
          <VerticalOscillationChart data={voData.data} />
        ) : null}
      </div>
    </div>
  );
}
