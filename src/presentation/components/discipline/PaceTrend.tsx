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
import { paceToMinKmString } from "@/domain/utils/formatters";

interface PaceTrendPoint {
  date: string;
  sessionId: string;
  avgPace: number; // seconds per km
}

interface PaceTrendProps {
  data: PaceTrendPoint[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

import { linearRegression } from "@/domain/utils/trendUtils";

function linearTrend(
  points: { dateTs: number; pace: number }[]
): { dateTs: number; trendPace: number }[] {
  if (points.length < 2) return [];
  const result = linearRegression(points.map((p) => ({ x: p.dateTs, y: p.pace })));
  return points.map((p, i) => ({ dateTs: p.dateTs, trendPace: result.predictions[i] }));
}

export default function PaceTrend({ data }: PaceTrendProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const runColor = getSportColor("run");

  if (data.length === 0) {
    return (
      <div
        data-testid="pace-trend"
        className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ikke nok data til at vise pace-trend.
        </p>
      </div>
    );
  }

  const chartPoints = data.map((p) => ({
    date: p.date,
    dateTs: new Date(p.date).getTime(),
    pace: p.avgPace,
  }));

  const trend = linearTrend(chartPoints);

  const mergedData = chartPoints.map((p, i) => ({
    ...p,
    trendPace: trend[i]?.trendPace ?? null,
  }));

  return (
    <div data-testid="pace-trend" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Pace-trend
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
              reversed
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v: number) => paceToMinKmString(v)}
              domain={["auto", "auto"]}
              label={{
                value: "min/km",
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <Tooltip cursor={false}
              labelFormatter={formatDate}
              formatter={(value: number, name: string) => [
                paceToMinKmString(value) + "/km",
                name === "pace" ? "Pace" : "Trend",
              ]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Scatter
              dataKey="pace"
              fill={runColor}
              name="Pace"
              shape="circle"
              r={4}
            />
            <Line
              type="monotone"
              dataKey="trendPace"
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
