import type { PhaseCompliance } from "@/application/hooks/planning/useMesocycle";

interface PhaseComplianceCardsProps {
  phases: PhaseCompliance[];
  isLoading: boolean;
}

const PHASE_COLORS: Record<string, string> = {
  base: "border-blue-500/30 bg-blue-500/10",
  build: "border-orange-500/30 bg-orange-500/10",
  peak: "border-red-500/30 bg-red-500/10",
  race: "border-yellow-500/30 bg-yellow-500/10",
  recovery: "border-green-500/30 bg-green-500/10",
  transition: "border-purple-500/30 bg-purple-500/10",
};

const PHASE_LABELS: Record<string, string> = {
  base: "Grundtraening",
  build: "Opbygning",
  peak: "Top",
  race: "Konkurrence",
  recovery: "Restitution",
  transition: "Overgang",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
  });
}

export default function PhaseComplianceCards({
  phases,
  isLoading,
}: PhaseComplianceCardsProps) {
  if (isLoading) {
    return (
      <div data-testid="phase-compliance" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg border border-border bg-muted" />
        ))}
      </div>
    );
  }

  if (!phases || phases.length === 0) return null;

  const now = new Date();

  return (
    <div data-testid="phase-compliance" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {phases.map((phase) => {
        const isActive = now >= new Date(phase.startDate) && now <= new Date(phase.endDate);
        const isPast = now > new Date(phase.endDate);
        const colorClass = PHASE_COLORS[phase.phaseType] || "border-border bg-card";
        const label = PHASE_LABELS[phase.phaseType] || phase.phaseType;
        const complianceColor =
          phase.compliancePct >= 90
            ? "text-green-400"
            : phase.compliancePct >= 70
              ? "text-amber-400"
              : "text-red-400";

        return (
          <div
            key={phase.phaseId}
            data-testid={`phase-card-${phase.phaseType}`}
            className={`rounded-lg border p-4 ${colorClass} ${
              isActive ? "ring-2 ring-primary/30" : ""
            } ${isPast ? "opacity-60" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <h4 className="text-sm font-semibold text-foreground">{phase.phaseName}</h4>
              </div>
              {isActive && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                  AKTIV
                </span>
              )}
            </div>

            <p className="mt-1 text-[10px] text-muted-foreground">
              {formatDate(phase.startDate)} — {formatDate(phase.endDate)}
            </p>

            {/* Hours progress bar */}
            {phase.targetHours > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Timer</span>
                  <span className={complianceColor}>
                    {phase.actualHours} / {phase.targetHours}h ({phase.compliancePct}%)
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, phase.compliancePct)}%` }}
                  />
                </div>
              </div>
            )}

            {/* CTL target */}
            {phase.ctlTarget && (
              <p className="mt-2 text-xs text-muted-foreground">
                CTL-maal: <span className="font-semibold text-foreground">{phase.ctlTarget}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
