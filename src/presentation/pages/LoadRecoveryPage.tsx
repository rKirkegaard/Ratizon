import { useState } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import {
  usePMC,
  useRampRate,
  useMonotony,
  useSportBalance,
} from "@/application/hooks/analytics/useAnalytics";
import RampRateChart from "@/presentation/components/analytics/RampRateChart";
import MonotonyStrainChart from "@/presentation/components/analytics/MonotonyStrainChart";
import SportBalanceChart from "@/presentation/components/analytics/SportBalanceChart";

type PeriodOption = { value: number; label: string; weeks: number };

const PERIODS: PeriodOption[] = [
  { value: 42, label: "6 uger", weeks: 6 },
  { value: 84, label: "12 uger", weeks: 12 },
  { value: 182, label: "6 mdr", weeks: 26 },
];

function getTsbStatus(tsb: number): { label: string; color: string; badge: string } {
  if (tsb >= 5 && tsb <= 25) return { label: "Optimal", color: "#28CF59", badge: "bg-green-500/15 text-green-600" };
  if (tsb > 25) return { label: "Dekonditionering", color: "#F6D74A", badge: "bg-amber-500/15 text-amber-600" };
  if (tsb < -10) return { label: "Overtraenet", color: "#D32F2F", badge: "bg-red-500/15 text-red-600" };
  return { label: "Frisk", color: "#3B82F6", badge: "bg-blue-500/15 text-blue-600" };
}

function getTrend(current: number, previous: number): "up" | "down" | "flat" {
  const diff = current - previous;
  if (Math.abs(diff) < 0.5) return "flat";
  return diff > 0 ? "up" : "down";
}

function StatusCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-card p-5">
      <div className="h-3 w-20 rounded bg-muted" />
      <div className="mt-3 h-8 w-16 rounded bg-muted" />
      <div className="mt-2 h-4 w-24 rounded bg-muted" />
    </div>
  );
}

function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={`animate-pulse rounded-lg border border-border bg-card p-4 ${height}`}>
      <div className="h-3 w-40 rounded bg-muted" />
      <div className="mt-4 h-full rounded bg-muted/30" />
    </div>
  );
}

export default function LoadRecoveryPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const [periodIndex, setPeriodIndex] = useState(1);
  const period = PERIODS[periodIndex];

  const { data: pmcData, isLoading: pmcLoading } = usePMC(athleteId, period.value);
  const { data: rampData, isLoading: rampLoading } = useRampRate(athleteId, period.weeks);
  const { data: monotonyData, isLoading: monotonyLoading } = useMonotony(athleteId, period.weeks);
  const { data: balanceData, isLoading: balanceLoading } = useSportBalance(athleteId, period.weeks);

  // Latest PMC values
  const latestPmc = pmcData?.points[pmcData.points.length - 1];
  const prevPmc = pmcData?.points.length && pmcData.points.length >= 8
    ? pmcData.points[pmcData.points.length - 8]
    : null;

  const tsbStatus = latestPmc ? getTsbStatus(latestPmc.tsb) : null;
  const atlTrend = latestPmc && prevPmc ? getTrend(latestPmc.atl, prevPmc.atl) : "flat";
  const ctlTrend = latestPmc && prevPmc ? getTrend(latestPmc.ctl, prevPmc.ctl) : "flat";

  const trendArrow = (trend: "up" | "down" | "flat") => {
    if (trend === "up") return "↑";
    if (trend === "down") return "↓";
    return "→";
  };

  if (!athleteId) {
    return (
      <div data-testid="load-recovery-page" className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            Vaelg en atlet for at se load & restitution.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="load-recovery-page" className="space-y-6 p-4 md:p-6">
      {/* Header + period selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Load & Restitution</h1>

        <div data-testid="period-selector" className="flex gap-1 rounded-lg bg-muted/50 p-1">
          {PERIODS.map((p, idx) => (
            <button
              key={p.value}
              data-testid={`period-${p.value}`}
              onClick={() => setPeriodIndex(idx)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                periodIndex === idx
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top status cards */}
      {pmcLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <StatusCardSkeleton />
          <StatusCardSkeleton />
          <StatusCardSkeleton />
        </div>
      ) : latestPmc ? (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Form / TSB */}
          <div
            data-testid="status-card-form"
            className="rounded-lg border bg-card p-5"
            style={{ borderLeftColor: tsbStatus?.color, borderLeftWidth: 4 }}
          >
            <p className="text-xs font-medium text-muted-foreground">Form (TSB)</p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {Math.round(latestPmc.tsb)}
            </p>
            {tsbStatus && (
              <span
                className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tsbStatus.badge}`}
              >
                {tsbStatus.label}
              </span>
            )}
          </div>

          {/* Fatigue / ATL */}
          <div
            data-testid="status-card-fatigue"
            className="rounded-lg border bg-card p-5"
            style={{ borderLeftColor: "#EF4444", borderLeftWidth: 4 }}
          >
            <p className="text-xs font-medium text-muted-foreground">Traethed (ATL)</p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {Math.round(latestPmc.atl)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {trendArrow(atlTrend)} {atlTrend === "up" ? "Stigende" : atlTrend === "down" ? "Faldende" : "Stabil"}
            </p>
          </div>

          {/* Fitness / CTL */}
          <div
            data-testid="status-card-fitness"
            className="rounded-lg border bg-card p-5"
            style={{ borderLeftColor: "#3B82F6", borderLeftWidth: 4 }}
          >
            <p className="text-xs font-medium text-muted-foreground">Fitness (CTL)</p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {Math.round(latestPmc.ctl)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {trendArrow(ctlTrend)} {ctlTrend === "up" ? "Stigende" : ctlTrend === "down" ? "Faldende" : "Stabil"}
            </p>
          </div>
        </div>
      ) : null}

      {/* Ramp Rate */}
      {rampLoading ? (
        <ChartSkeleton />
      ) : rampData ? (
        <RampRateChart points={rampData.points} />
      ) : null}

      {/* 2-column: Monotony + Sport Balance */}
      <div className="grid gap-4 md:grid-cols-2">
        {monotonyLoading ? (
          <ChartSkeleton />
        ) : monotonyData ? (
          <MonotonyStrainChart points={monotonyData.points} />
        ) : null}

        {balanceLoading ? (
          <ChartSkeleton />
        ) : balanceData ? (
          <SportBalanceChart points={balanceData.points} sports={balanceData.sports} />
        ) : null}
      </div>
    </div>
  );
}
