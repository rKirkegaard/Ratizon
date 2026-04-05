import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { MesocyclePhase, CTLPoint } from "@/application/hooks/planning/useMesocycle";

interface MesocycleTimelineProps {
  phases: MesocyclePhase[];
  ctlTimeSeries: CTLPoint[];
  mainGoal: { title: string; targetDate: string | null } | null;
  isLoading: boolean;
}

const PHASE_COLORS: Record<string, string> = {
  base: "#3B82F6",       // blue
  build: "#F97316",      // orange
  peak: "#EF4444",       // red
  race: "#EAB308",       // gold
  recovery: "#22C55E",   // green
  transition: "#8B5CF6", // purple
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

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
  return `U${weekNum}`;
}

export default function MesocycleTimeline({
  phases,
  ctlTimeSeries,
  mainGoal,
  isLoading,
}: MesocycleTimelineProps) {
  if (isLoading) {
    return (
      <div data-testid="mesocycle-timeline" className="h-80 animate-pulse rounded-lg border border-border bg-card p-4">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="mt-4 h-full rounded bg-muted/30" />
      </div>
    );
  }

  if (phases.length === 0 && ctlTimeSeries.length === 0) {
    return (
      <div
        data-testid="mesocycle-timeline"
        className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ingen traeningsfaser oprettet endnu. Opret faser under Saeson & Maal.
        </p>
      </div>
    );
  }

  // Build CTL target stepped line from phases
  const ctlTargetByDate = new Map<string, number>();
  for (const phase of phases) {
    if (phase.ctlTarget) {
      const start = new Date(phase.startDate);
      const end = new Date(phase.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        ctlTargetByDate.set(d.toISOString().split("T")[0], phase.ctlTarget);
      }
    }
  }

  // Merge CTL data with target
  const chartData = ctlTimeSeries.map((point) => {
    const dateKey = point.date.split("T")[0];
    return {
      date: dateKey,
      ctl: Math.round(point.ctl * 10) / 10,
      atl: Math.round(point.atl * 10) / 10,
      tsb: Math.round(point.tsb * 10) / 10,
      ctlTarget: ctlTargetByDate.get(dateKey) ?? null,
    };
  });

  // Today marker
  const today = new Date().toISOString().split("T")[0];

  // Race date
  const raceDate = mainGoal?.targetDate?.split("T")[0] ?? null;

  return (
    <div data-testid="mesocycle-timeline" className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Mesocyklus-overblik</h3>
        {mainGoal && (
          <span className="text-xs text-muted-foreground">
            Maal: {mainGoal.title}
          </span>
        )}
      </div>

      {/* Phase bars */}
      <div className="mb-3 flex gap-1 overflow-x-auto">
        {phases.map((phase) => {
          const color = PHASE_COLORS[phase.phaseType] || "#6B7280";
          const label = PHASE_LABELS[phase.phaseType] || phase.phaseType;
          const start = new Date(phase.startDate);
          const end = new Date(phase.endDate);
          const weeks = Math.max(1, Math.round((end.getTime() - start.getTime()) / (7 * 86400000)));
          const isActive = new Date() >= start && new Date() <= end;

          return (
            <div
              key={phase.id}
              data-testid={`phase-bar-${phase.phaseType}`}
              className={`relative rounded-md px-3 py-2 text-xs font-medium text-white transition-all ${
                isActive ? "ring-2 ring-white/50 ring-offset-1 ring-offset-background" : ""
              }`}
              style={{
                backgroundColor: color,
                flex: `${weeks} 0 0`,
                minWidth: "80px",
              }}
            >
              <div className="truncate font-semibold">{phase.phaseName || label}</div>
              <div className="mt-0.5 text-[10px] opacity-80">
                {formatDate(phase.startDate)} — {formatDate(phase.endDate)}
              </div>
              {phase.ctlTarget && (
                <div className="mt-0.5 text-[10px] opacity-80">
                  CTL-maal: {phase.ctlTarget}
                </div>
              )}
              {isActive && (
                <div className="absolute -top-1 right-1 h-2 w-2 rounded-full bg-white animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      {/* CTL Chart */}
      {chartData.length > 0 && (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={formatWeek}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelFormatter={(label) => formatDate(String(label))}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    ctl: "CTL (Fitness)",
                    atl: "ATL (Traethed)",
                    tsb: "TSB (Form)",
                    ctlTarget: "CTL-maal",
                  };
                  return [value?.toFixed(1) ?? "–", labels[name] || name];
                }}
              />

              {/* TSB area (background) */}
              <Area
                dataKey="tsb"
                fill="var(--primary)"
                fillOpacity={0.05}
                stroke="none"
              />

              {/* CTL target (dashed) */}
              <Line
                dataKey="ctlTarget"
                stroke="#EAB308"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                connectNulls={false}
              />

              {/* CTL actual */}
              <Line
                dataKey="ctl"
                stroke="#22C55E"
                strokeWidth={2}
                dot={false}
              />

              {/* ATL */}
              <Line
                dataKey="atl"
                stroke="#EF4444"
                strokeWidth={1.5}
                dot={false}
                opacity={0.7}
              />

              {/* Today marker */}
              <ReferenceLine
                x={today}
                stroke="var(--foreground)"
                strokeWidth={2}
                strokeDasharray="4 2"
                label={{
                  value: "I dag",
                  position: "top",
                  fill: "var(--foreground)",
                  fontSize: 10,
                }}
              />

              {/* Race date marker */}
              {raceDate && (
                <ReferenceLine
                  x={raceDate}
                  stroke="#EAB308"
                  strokeWidth={2}
                  label={{
                    value: "Race",
                    position: "top",
                    fill: "#EAB308",
                    fontSize: 10,
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-green-500" /> CTL (Fitness)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded bg-red-500" /> ATL (Traethed)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded border border-yellow-500 border-dashed" /> CTL-maal
        </span>
      </div>
    </div>
  );
}
