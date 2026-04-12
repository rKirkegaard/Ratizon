import { ChevronRight, AlertTriangle } from "lucide-react";
import type { CTLEstimateData } from "@/application/hooks/planning/useCTLEstimate";

interface PerformancePipelineProps {
  estimate: CTLEstimateData;
}

function formatPace(totalSec: number): string {
  if (!totalSec || totalSec <= 0) return "–";
  const min = Math.floor(totalSec / 60);
  const sec = Math.round(totalSec % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function formatTime(totalSec: number): string {
  if (!totalSec || totalSec <= 0) return "–";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const styles = {
    high: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    moderate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  const labels = { high: "Hoej", moderate: "Moderat", low: "Lav" };
  const cls = styles[confidence as keyof typeof styles] ?? styles.low;
  const label = labels[confidence as keyof typeof labels] ?? confidence;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${cls}`}>
      {label} sikkerhed
    </span>
  );
}

function StepCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 rounded-lg border border-border/50 bg-muted/20 p-3 min-w-0">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center px-1 text-muted-foreground/50 shrink-0">
      <ChevronRight size={16} />
    </div>
  );
}

export default function PerformancePipeline({ estimate }: PerformancePipelineProps) {
  const e = estimate;

  return (
    <div
      data-testid="performance-pipeline"
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Praestationskrav
        </h3>
        <ConfidenceBadge confidence={e.confidence} />
      </div>

      {/* Warnings from the estimator (e.g. IF too high for race distance) */}
      {e.warnings && e.warnings.length > 0 && (
        <div className="mb-3 space-y-1">
          {e.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-stretch gap-0">
        {/* Step 1: Race target */}
        <StepCard title="Race maal">
          <p className="text-lg font-bold text-foreground">
            {formatTime(e.raceTSS.totalTSS ? e.raceTSS.swimTSS + e.raceTSS.bikeTSS + e.raceTSS.runTSS : 0).length > 1 ? e.goalTitle : "–"}
          </p>
          <p className="text-xs text-muted-foreground capitalize">{e.raceType}</p>
        </StepCard>

        <Arrow />

        {/* Step 2: Required thresholds */}
        <StepCard title="Kraevede tærskler">
          <div className="space-y-0.5 text-xs">
            {e.derivedThresholds.requiredFtp > 0 && (
              <p>
                <span className="text-muted-foreground">FTP:</span>{" "}
                <span className="font-semibold text-foreground">{Math.round(e.derivedThresholds.requiredFtp)}W</span>
              </p>
            )}
            {e.derivedThresholds.requiredRunThresholdPaceSec > 0 && (
              <p>
                <span className="text-muted-foreground">Loeb:</span>{" "}
                <span className="font-semibold text-foreground">{formatPace(e.derivedThresholds.requiredRunThresholdPaceSec)}/km</span>
              </p>
            )}
            {e.derivedThresholds.requiredSwimCssSec > 0 && (
              <p>
                <span className="text-muted-foreground">CSS:</span>{" "}
                <span className="font-semibold text-foreground">{formatPace(e.derivedThresholds.requiredSwimCssSec)}/100m</span>
              </p>
            )}
          </div>
        </StepCard>

        <Arrow />

        {/* Step 3: Required CTL */}
        <StepCard title="CTL krav">
          <p className="text-2xl font-bold text-emerald-400">{e.requiredCTL}</p>
          <p className="text-xs text-muted-foreground">
            Nu: {Math.round(e.currentCTL)}{" "}
            {e.ctlGap > 0 && (
              <span className="text-amber-400">({e.ctlGap} mangler)</span>
            )}
            {e.ctlGap <= 0 && (
              <span className="text-emerald-400">Paa maal!</span>
            )}
          </p>
        </StepCard>

        <Arrow />

        {/* Step 4: Weekly TSS */}
        <StepCard title="Ugentlig TSS">
          <p className="text-lg font-bold text-foreground">{e.weeklyTSSNeeded}</p>
          <p className="text-xs text-muted-foreground">
            Ramp: {e.requiredRampRate > 0 ? `+${e.requiredRampRate}/uge` : "–"}
          </p>
          <p className="text-xs text-muted-foreground">
            {e.weeksToRace} uger til race
          </p>
        </StepCard>
      </div>
    </div>
  );
}
