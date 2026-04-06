import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { WellnessDaily } from "@/domain/types/wellness.types";

interface SleepChartProps {
  history: WellnessDaily[];
  isLoading: boolean;
}

interface ChartPoint {
  date: string;
  dateLabel: string;
  hours: number;
  color: string;
}

function sleepColor(hours: number): string {
  if (hours >= 7) return "#28CF59";
  if (hours >= 6) return "#F6D74A";
  return "#D32F2F";
}

function ChartSkeleton() {
  return (
    <div
      data-testid="sleep-chart-skeleton"
      className="h-48 animate-pulse rounded-lg bg-muted"
    />
  );
}

export default function SleepChart({ history, isLoading }: SleepChartProps) {
  if (isLoading) return <ChartSkeleton />;

  const data: ChartPoint[] = history
    .filter((d) => d.sleepHours != null)
    .map((d) => ({
      date: d.date,
      dateLabel: new Date(d.date).toLocaleDateString("da-DK", {
        day: "numeric",
        month: "short",
      }),
      hours: d.sleepHours!,
      color: sleepColor(d.sleepHours!),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (data.length === 0) {
    return (
      <div
        data-testid="sleep-chart"
        className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ingen sovndata tilgaengelig.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="sleep-chart" className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Sovn (30 dage)</h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 12]}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              width={30}
              unit="t"
            />
            <Tooltip cursor={false}
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(val: number) => [`${val.toFixed(1)} timer`, "Sovn"]}
            />
            {/* 7-hour target line */}
            <ReferenceLine
              y={7}
              stroke="#28CF59"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{
                value: "7t",
                position: "right",
                fill: "var(--muted-foreground)",
                fontSize: 10,
              }}
            />
            <Bar dataKey="hours" radius={[3, 3, 0, 0]} maxBarSize={20}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
