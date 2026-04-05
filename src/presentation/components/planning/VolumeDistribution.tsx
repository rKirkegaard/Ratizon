import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAthleteStore } from "@/application/stores/athleteStore";
import type { WeeklyActual } from "@/application/hooks/planning/useMesocycle";

interface VolumeDistributionProps {
  actuals: WeeklyActual[];
  isLoading: boolean;
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
  return `U${weekNum}`;
}

export default function VolumeDistribution({
  actuals,
  isLoading,
}: VolumeDistributionProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);

  if (isLoading) {
    return (
      <div data-testid="volume-distribution" className="h-64 animate-pulse rounded-lg border border-border bg-card p-4">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="mt-4 h-full rounded bg-muted/30" />
      </div>
    );
  }

  if (!actuals || actuals.length === 0) {
    return (
      <div
        data-testid="volume-distribution"
        className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ingen traeningsdata til volumenvisning.
        </p>
      </div>
    );
  }

  // Take last 16 weeks
  const recent = actuals.slice(-16);

  const chartData = recent.map((w) => ({
    week: formatWeek(w.weekStart),
    swim: Math.round(w.swimHours * 10) / 10,
    bike: Math.round(w.bikeHours * 10) / 10,
    run: Math.round(w.runHours * 10) / 10,
    strength: Math.round(w.strengthHours * 10) / 10,
    total: Math.round(w.totalHours * 10) / 10,
  }));

  const swimColor = getSportColor("swim");
  const bikeColor = getSportColor("bike");
  const runColor = getSportColor("run");
  const strengthColor = getSportColor("strength");

  return (
    <div data-testid="volume-distribution" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-base font-semibold text-foreground">
        Ugentlig volumen (timer)
      </h3>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              width={30}
              label={{
                value: "Timer",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 10, fill: "var(--muted-foreground)" },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  swim: "Svoem",
                  bike: "Cykel",
                  run: "Loeb",
                  strength: "Styrke",
                };
                return [`${value}h`, labels[name] || name];
              }}
            />
            <Legend
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  swim: "Svoem",
                  bike: "Cykel",
                  run: "Loeb",
                  strength: "Styrke",
                };
                return labels[value] || value;
              }}
              wrapperStyle={{ fontSize: "11px" }}
            />
            <Bar dataKey="swim" stackId="sports" fill={swimColor} radius={[0, 0, 0, 0]} />
            <Bar dataKey="bike" stackId="sports" fill={bikeColor} radius={[0, 0, 0, 0]} />
            <Bar dataKey="run" stackId="sports" fill={runColor} radius={[0, 0, 0, 0]} />
            <Bar dataKey="strength" stackId="sports" fill={strengthColor} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
