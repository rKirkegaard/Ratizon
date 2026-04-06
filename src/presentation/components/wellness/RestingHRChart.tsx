import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WellnessDaily } from "@/domain/types/wellness.types";

interface RestingHRChartProps {
  history: WellnessDaily[];
  isLoading: boolean;
}

interface ChartPoint {
  date: string;
  dateLabel: string;
  rhr: number | null;
}

function ChartSkeleton() {
  return (
    <div
      data-testid="resting-hr-chart-skeleton"
      className="h-48 animate-pulse rounded-lg bg-muted"
    />
  );
}

export default function RestingHRChart({ history, isLoading }: RestingHRChartProps) {
  if (isLoading) return <ChartSkeleton />;

  const data: ChartPoint[] = history
    .filter((d) => d.restingHr != null)
    .map((d) => ({
      date: d.date,
      dateLabel: new Date(d.date).toLocaleDateString("da-DK", {
        day: "numeric",
        month: "short",
      }),
      rhr: d.restingHr,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (data.length === 0) {
    return (
      <div
        data-testid="resting-hr-chart"
        className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ingen hvilepulsdata tilgaengelig.
        </p>
      </div>
    );
  }

  const rhrValues = data.map((d) => d.rhr).filter((v): v is number => v != null);
  const minRhr = Math.max(30, Math.min(...rhrValues) - 5);
  const maxRhr = Math.max(...rhrValues) + 5;

  return (
    <div data-testid="resting-hr-chart" className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Hvilepuls (30 dage)</h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minRhr, maxRhr]}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              width={35}
            />
            <Tooltip cursor={false}
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(val: number) => [`${Math.round(val)} bpm`, "Hvilepuls"]}
            />
            <Line
              type="monotone"
              dataKey="rhr"
              stroke="hsl(0, 80%, 55%)"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "hsl(0, 80%, 55%)" }}
              connectNulls
              name="Hvilepuls"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
