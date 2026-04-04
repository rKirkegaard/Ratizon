import { BarChart3 } from "lucide-react";
import type { WeekStatusData } from "@/application/hooks/useDashboard";

interface WeekStatusProps {
  weekStatus: WeekStatusData;
}

export default function WeekStatus({ weekStatus }: WeekStatusProps) {
  const tssPercent =
    weekStatus.tss_planned > 0
      ? Math.min(100, Math.round((weekStatus.tss_actual / weekStatus.tss_planned) * 100))
      : 0;

  const barColor =
    tssPercent >= 90 && tssPercent <= 110
      ? "bg-green-500"
      : tssPercent > 110
        ? "bg-red-500"
        : "bg-primary";

  return (
    <div
      data-testid="week-status"
      className="rounded-lg border border-border/50 bg-card p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Ugestatus</h3>
      </div>

      {/* TSS progress bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">TSS</span>
          <span className="text-xs text-muted-foreground">
            {Math.round(weekStatus.tss_actual)} / {Math.round(weekStatus.tss_planned)}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-accent">
          <div
            data-testid="tss-progress-bar"
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${tssPercent}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-muted-foreground">{tssPercent}%</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Sessioner</p>
          <p className="text-sm font-semibold text-foreground">
            {weekStatus.sessions_completed} / {weekStatus.sessions_planned}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Compliance</p>
          <p className="text-sm font-semibold text-foreground">
            {Math.round(weekStatus.compliance_pct)}%
          </p>
        </div>
      </div>

      {/* Remaining */}
      {weekStatus.remaining_text && (
        <p className="mt-3 text-xs text-muted-foreground">{weekStatus.remaining_text}</p>
      )}
    </div>
  );
}
