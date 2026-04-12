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
import type { VerticalRatioPoint } from "@/application/hooks/analytics/useRunningAnalytics";

interface VerticalOscillationChartProps {
  data: VerticalRatioPoint[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

import { scatterTrend as linearTrend } from "@/domain/utils/trendUtils";

export default function VerticalOscillationChart({ data }: VerticalOscillationChartProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const runColor = getSportColor("run");

  if (data.length === 0) {
    return (
      <div
        data-testid="vo-chart"
        className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ikke nok data til at vise vertikal oscillation.
        </p>
      </div>
    );
  }

  const chartPoints = data.map((p) => ({
    date: p.date,
    dateTs: new Date(p.date).getTime(),
    vo: p.avgVo,
  }));

  const trend = linearTrend(chartPoints.map((p) => ({ x: p.dateTs, y: p.vo })));

  const mergedData = chartPoints.map((p, i) => ({
    ...p,
    trendVo: trend[i]?.ty ?? null,
  }));

  return (
    <div data-testid="vo-chart" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Vertikal Oscillation
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
                value: "cm",
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <Tooltip cursor={false}
              labelFormatter={formatDate}
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)} cm`,
                name === "vo" ? "VO" : "Trend",
              ]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Scatter dataKey="vo" fill={runColor} name="VO" shape="circle" r={4} />
            <Line
              type="monotone"
              dataKey="trendVo"
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
