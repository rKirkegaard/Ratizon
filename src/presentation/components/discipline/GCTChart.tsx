import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAthleteStore } from "@/application/stores/athleteStore";
import type { GCTPoint } from "@/application/hooks/analytics/useRunningAnalytics";

interface GCTChartProps {
  data: GCTPoint[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

function linearTrend(points: { x: number; y: number }[]): { x: number; ty: number }[] {
  if (points.length < 2) return [];
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return [];
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return points.map((p) => ({ x: p.x, ty: slope * p.x + intercept }));
}

export default function GCTChart({ data }: GCTChartProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const runColor = getSportColor("run");

  if (data.length === 0) {
    return (
      <div
        data-testid="gct-chart"
        className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ikke nok data til at vise GCT-trend.
        </p>
      </div>
    );
  }

  const chartPoints = data.map((p) => ({
    date: p.date,
    dateTs: new Date(p.date).getTime(),
    gct: p.avgGct,
  }));

  const trend = linearTrend(chartPoints.map((p) => ({ x: p.dateTs, y: p.gct })));

  const mergedData = chartPoints.map((p, i) => ({
    ...p,
    trendGct: trend[i]?.ty ?? null,
  }));

  return (
    <div data-testid="gct-chart" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Ground Contact Time
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={mergedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              domain={["auto", "auto"]}
              label={{
                value: "ms",
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <Tooltip cursor={false}
              labelFormatter={formatDate}
              formatter={(value: number, name: string) => [
                `${Math.round(value)} ms`,
                name === "gct" ? "GCT" : "Trend",
              ]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Scatter dataKey="gct" fill={runColor} name="GCT" shape="circle" r={4} />
            <Line
              type="monotone"
              dataKey="trendGct"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              name="Trend"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
