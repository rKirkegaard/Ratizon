import { useState } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import {
  usePMC,
  useEFTrend,
  usePaceAtHR,
  usePowerAtHR,
} from "@/application/hooks/analytics/useAnalytics";
import PMCChart from "@/presentation/components/analytics/PMCChart";
import EFTrendChart from "@/presentation/components/analytics/EFTrendChart";
import PaceAtHRChart from "@/presentation/components/analytics/PaceAtHRChart";
import PowerAtHRChart from "@/presentation/components/analytics/PowerAtHRChart";

type PeriodOption = { value: number; label: string };

const PERIODS: PeriodOption[] = [
  { value: 90, label: "3 mdr" },
  { value: 180, label: "6 mdr" },
  { value: 365, label: "12 mdr" },
  { value: 9999, label: "Al tid" },
];

function ChartSkeleton({ height = "h-80" }: { height?: string }) {
  return (
    <div className={`animate-pulse rounded-lg border border-border bg-card p-4 ${height}`}>
      <div className="h-3 w-40 rounded bg-muted" />
      <div className="mt-4 h-full rounded bg-muted/30" />
    </div>
  );
}

export default function PerformancePage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);

  const [days, setDays] = useState(90);
  const [paceHrMin, setPaceHrMin] = useState(140);
  const [paceHrMax, setPaceHrMax] = useState(155);
  const [powerHrMin, setPowerHrMin] = useState(140);
  const [powerHrMax, setPowerHrMax] = useState(155);

  const { data: pmcData, isLoading: pmcLoading } = usePMC(athleteId, days);
  const { data: efData, isLoading: efLoading } = useEFTrend(athleteId, days);
  const { data: paceData, isLoading: paceLoading } = usePaceAtHR(
    athleteId,
    paceHrMin,
    paceHrMax
  );
  const { data: powerData, isLoading: powerLoading } = usePowerAtHR(
    athleteId,
    powerHrMin,
    powerHrMax
  );

  if (!athleteId) {
    return (
      <div data-testid="performance-page" className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            Vaelg en atlet for at se performance-data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="performance-page" className="space-y-6 p-4 md:p-6">
      {/* Header + period selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Performance</h1>

        <div data-testid="period-selector" className="flex gap-1 rounded-lg bg-muted/50 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              data-testid={`period-${p.value}`}
              onClick={() => setDays(p.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                days === p.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* PMC Chart - full width */}
      {pmcLoading ? (
        <ChartSkeleton height="h-80" />
      ) : pmcData ? (
        <PMCChart points={pmcData.points} />
      ) : null}

      {/* EF Trend */}
      {efLoading ? (
        <ChartSkeleton height="h-64" />
      ) : efData ? (
        <EFTrendChart points={efData.points} trendLine={efData.trendLine} />
      ) : null}

      {/* 2-column: Pace at HR + Power at HR */}
      <div className="grid gap-4 md:grid-cols-2">
        {paceLoading ? (
          <ChartSkeleton height="h-64" />
        ) : paceData ? (
          <PaceAtHRChart
            points={paceData.points}
            trendLine={paceData.trendLine}
            hrMin={paceHrMin}
            hrMax={paceHrMax}
            onHRRangeChange={(min, max) => {
              setPaceHrMin(min);
              setPaceHrMax(max);
            }}
          />
        ) : null}

        {powerLoading ? (
          <ChartSkeleton height="h-64" />
        ) : powerData ? (
          <PowerAtHRChart
            points={powerData.points}
            trendLine={powerData.trendLine}
            hrMin={powerHrMin}
            hrMax={powerHrMax}
            onHRRangeChange={(min, max) => {
              setPowerHrMin(min);
              setPowerHrMax(max);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
