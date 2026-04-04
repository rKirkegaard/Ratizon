import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { TrafficLight } from "@/presentation/components/shared/TrafficLight";
import type { FitnessData } from "@/application/hooks/useDashboard";

interface FitnessStatusProps {
  fitness: FitnessData;
}

function TrendArrow({ value }: { value: number }) {
  if (value > 0) return <TrendingUp size={14} className="text-green-500" />;
  if (value < 0) return <TrendingDown size={14} className="text-red-500" />;
  return <Minus size={14} className="text-muted-foreground" />;
}

export default function FitnessStatus({ fitness }: FitnessStatusProps) {
  return (
    <div
      data-testid="fitness-status"
      className="rounded-lg border border-border/50 bg-card p-4"
    >
      <h3 className="mb-3 text-sm font-semibold text-foreground">Fitness Status</h3>

      <div className="space-y-3">
        {/* CTL */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">CTL (Fitness)</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">
              {Math.round(fitness.ctl)}
            </span>
            <TrendArrow value={fitness.ctl_trend} />
            <span className="text-xs text-muted-foreground">
              {fitness.ctl_trend > 0 ? "+" : ""}
              {fitness.ctl_trend.toFixed(1)} / 7d
            </span>
          </div>
        </div>

        {/* ATL */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">ATL (Traethed)</span>
          <span className="text-lg font-bold text-foreground">
            {Math.round(fitness.atl)}
          </span>
        </div>

        {/* TSB */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">TSB (Form)</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">
              {fitness.tsb > 0 ? "+" : ""}
              {Math.round(fitness.tsb)}
            </span>
            <TrafficLight status={fitness.tsb_status} />
          </div>
        </div>

        {/* TSB interpretation */}
        <div className="rounded-md bg-accent/50 px-3 py-2">
          <span className="text-sm text-foreground">{fitness.tsb_label}</span>
        </div>
      </div>
    </div>
  );
}
