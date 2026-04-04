import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { formatPacePer100m } from "@/domain/utils/formatters";
import type { SwimPacePoint } from "@/application/hooks/analytics/useSwimmingAnalytics";

interface SwimPaceChartProps {
  data: SwimPacePoint[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

function paceToMinSec(secondsPer100m: number): string {
  const m = Math.floor(secondsPer100m / 60);
  const s = Math.round(secondsPer100m % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SwimPaceChart({ data }: SwimPaceChartProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const swimColor = getSportColor("swim");

  if (data.length === 0) {
    return (
      <div
        data-testid="swim-pace-chart"
        className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ikke nok data til at vise svomme-pace.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="swim-pace-chart" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Pace-progression
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              interval="preserveStartEnd"
            />
            <YAxis
              reversed
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v: number) => paceToMinSec(v)}
              domain={["auto", "auto"]}
              label={{
                value: "min/100m",
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <Tooltip
              labelFormatter={formatDate}
              formatter={(value: number) => [
                formatPacePer100m(value),
                "Pace",
              ]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="avgPace"
              stroke={swimColor}
              strokeWidth={2}
              dot={{ fill: swimColor, r: 3 }}
              name="Pace"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Lavere = hurtigere
      </p>
    </div>
  );
}
