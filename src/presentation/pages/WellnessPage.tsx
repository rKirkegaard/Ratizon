import { useAthleteStore } from "@/application/stores/athleteStore";
import {
  useWellnessLatest,
  useWellnessHistory,
  useHRVGate,
} from "@/application/hooks/wellness/useWellness";
import { StatCard } from "@/presentation/components/shared/StatCard";
import WellnessStatusBanner from "@/presentation/components/wellness/WellnessStatusBanner";
import HRVTrendChart from "@/presentation/components/wellness/HRVTrendChart";
import RestingHRChart from "@/presentation/components/wellness/RestingHRChart";
import SleepChart from "@/presentation/components/wellness/SleepChart";

function MetricCardSkeleton() {
  return (
    <div className="h-20 animate-pulse rounded-lg border border-border/50 bg-muted" />
  );
}

export default function WellnessPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);

  const { data: latestData, isLoading: latestLoading } = useWellnessLatest(athleteId);
  const { data: historyData, isLoading: historyLoading } = useWellnessHistory(athleteId, 30);
  const { data: gateData, isLoading: gateLoading } = useHRVGate(athleteId);

  const latest = latestData?.latest ?? null;
  const history = historyData?.history ?? [];

  const isMetricsLoading = latestLoading;

  // No athlete selected
  if (!athleteId) {
    return (
      <div data-testid="wellness-page" className="p-4 md:p-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">
          Wellness & Restitution
        </h1>
        <div
          data-testid="wellness-no-athlete"
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16"
        >
          <p className="text-sm text-muted-foreground">
            Vaelg en atlet for at se wellness-data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="wellness-page" className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-foreground">
        Wellness & Restitution
      </h1>

      {/* Status banner */}
      {gateData ? (
        <WellnessStatusBanner gate={gateData} isLoading={gateLoading} />
      ) : gateLoading ? (
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
      ) : (
        <div
          data-testid="wellness-status-banner"
          className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground"
        >
          Ingen HRV-gate data tilgaengelig endnu. Log wellness-data for at aktivere.
        </div>
      )}

      {/* Metric cards row */}
      <div
        data-testid="wellness-metrics"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5"
      >
        {isMetricsLoading ? (
          Array.from({ length: 5 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="HRV"
              value={latest?.hrvMssd != null ? Math.round(latest.hrvMssd) : "–"}
              unit="ms"
            />
            <StatCard
              label="Hvilepuls"
              value={latest?.restingHr != null ? Math.round(latest.restingHr) : "–"}
              unit="bpm"
            />
            <StatCard
              label="Sovn"
              value={
                latest?.sleepHours != null ? latest.sleepHours.toFixed(1) : "–"
              }
              unit="timer"
            />
            <StatCard
              label="Stress"
              value={latest?.stressLevel ?? "–"}
            />
            <StatCard
              label="Body Battery"
              value={latest?.bodyBattery ?? "–"}
              unit="%"
            />
          </>
        )}
      </div>

      {/* HRV Trend - full width */}
      <div className="rounded-lg border border-border/50 bg-card p-4">
        <HRVTrendChart
          history={history}
          baseline={gateData?.baseline ?? null}
          baselineSd={gateData?.baselineSd ?? null}
          isLoading={historyLoading}
        />
      </div>

      {/* Resting HR + Sleep side by side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <RestingHRChart history={history} isLoading={historyLoading} />
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <SleepChart history={history} isLoading={historyLoading} />
        </div>
      </div>
    </div>
  );
}
