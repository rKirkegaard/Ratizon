import { paceSecToMss } from "@/domain/utils/paceUtils";
import {
  calcExpectedThresholds,
  type ThresholdTarget,
  type ThresholdProgressionResult,
} from "@/domain/utils/thresholdProgression";
import type { DerivedThresholds } from "@/application/hooks/planning/useCTLEstimate";
import { TrendingUp, TrendingDown, Check } from "lucide-react";

interface ThresholdProgressionCardProps {
  currentBaselines: { ftp: number; runPaceSec: number; swimCssSec: number };
  requiredThresholds: DerivedThresholds;
  trainingStartDate: string;
  raceDate: string;
}

function formatValue(value: number, metric: "ftp" | "runPace" | "swimCss"): string {
  if (metric === "ftp") return `${Math.round(value)}W`;
  return paceSecToMss(Math.round(value));
}

function ThresholdRow({
  label,
  unit,
  color,
  target,
  metric,
}: {
  label: string;
  unit: string;
  color: string;
  target: ThresholdTarget;
  metric: "ftp" | "runPace" | "swimCss";
}) {
  const isLowerBetter = metric !== "ftp";

  // Progress bar: position of expectedToday between current and required
  const range = Math.abs(target.required - target.current);
  const progress = range > 0 ? Math.abs(target.expectedToday - target.current) / range : 0;
  const currentProgress = range > 0 ? Math.abs(target.current - (isLowerBetter ? target.required : target.current)) / range : 0;
  const barPct = Math.min(100, Math.round(progress * 100));

  return (
    <div data-testid={`threshold-row-${metric}`} className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color }}>{label}</span>
          {target.onTrack ? (
            <Check size={12} className="text-emerald-400" />
          ) : (
            <TrendingDown size={12} className="text-amber-400" />
          )}
        </div>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>

      {/* Values row */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Nu: <strong className="text-foreground">{formatValue(target.current, metric)}</strong></span>
        <span className={target.onTrack ? "text-emerald-400" : "text-amber-400"}>
          I dag: <strong>{formatValue(target.expectedToday, metric)}</strong>
          <span className="text-muted-foreground/70"> ({formatValue(target.lower, metric)} – {formatValue(target.upper, metric)})</span>
        </span>
        <span className="text-muted-foreground">Maal: <strong className="text-foreground">{formatValue(target.required, metric)}</strong></span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 w-full rounded-full bg-accent">
        {/* Expected today marker band */}
        <div
          className="absolute h-full rounded-full opacity-20"
          style={{
            backgroundColor: color,
            left: `${Math.max(0, barPct - 3)}%`,
            width: `6%`,
          }}
        />
        {/* Expected today marker */}
        <div
          className="absolute top-0 h-full w-0.5 rounded"
          style={{
            backgroundColor: color,
            left: `${barPct}%`,
          }}
        />
        {/* Actual progress fill */}
        <div
          className={`h-full rounded-full transition-all ${target.onTrack ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${Math.min(100, Math.round((isLowerBetter ? 1 - currentProgress : currentProgress) * 100))}%` }}
        />
      </div>
    </div>
  );
}

export default function ThresholdProgressionCard({
  currentBaselines,
  requiredThresholds,
  trainingStartDate,
  raceDate,
}: ThresholdProgressionCardProps) {
  const result = calcExpectedThresholds(
    currentBaselines,
    {
      ftp: requiredThresholds.requiredFtp,
      runPaceSec: requiredThresholds.requiredRunThresholdPaceSec,
      swimCssSec: requiredThresholds.requiredSwimCssSec,
    },
    new Date(trainingStartDate),
    new Date(raceDate),
  );

  return (
    <div data-testid="threshold-progression-card" className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Daglig formstatus
        </h3>
        <span className="text-xs text-muted-foreground">
          Dag {result.daysElapsed} af {result.daysTotal} ({Math.round(result.ftp.progressPct * 100)}%)
        </span>
      </div>

      <ThresholdRow label="FTP" unit="watt" color="#22c55e" target={result.ftp} metric="ftp" />
      <ThresholdRow label="Loeb" unit="min/km" color="#f97316" target={result.runPace} metric="runPace" />
      <ThresholdRow label="Svoem CSS" unit="min/100m" color="#22d3ee" target={result.swimCss} metric="swimCss" />
    </div>
  );
}
