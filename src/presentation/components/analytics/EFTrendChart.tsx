import {
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import { useAthleteStore } from "@/application/stores/athleteStore";
import type { EFPoint } from "@/application/hooks/analytics/useAnalytics";

interface EFTrendChartProps {
  points: EFPoint[];
  trendLine: { date: string; ef: number }[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

export default function EFTrendChart({ points, trendLine }: EFTrendChartProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);

  if (points.length === 0) {
    return (
      <div
        data-testid="ef-trend-chart"
        className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ikke nok data til at vise EF-trend.
        </p>
      </div>
    );
  }

  // Group by sport
  const sportGroups = new Map<string, { date: string; ef: number; dateTs: number }[]>();
  for (const p of points) {
    const ts = new Date(p.date).getTime();
    if (!sportGroups.has(p.sport)) sportGroups.set(p.sport, []);
    sportGroups.get(p.sport)!.push({ date: p.date, ef: p.ef, dateTs: ts });
  }

  // Merge all into one dataset for ComposedChart
  const allDatesSet = new Set<string>();
  for (const p of points) allDatesSet.add(p.date);
  for (const t of trendLine) allDatesSet.add(t.date);
  const allDates = Array.from(allDatesSet).sort();

  const mergedData = allDates.map((date) => {
    const entry: Record<string, unknown> = { date, dateTs: new Date(date).getTime() };
    for (const [sport, pts] of sportGroups) {
      const match = pts.find((p) => p.date === date);
      if (match) entry[`ef_${sport}`] = match.ef;
    }
    const tMatch = trendLine.find((t) => t.date === date);
    if (tMatch) entry.efTrend = tMatch.ef;
    return entry;
  });

  const sports = Array.from(sportGroups.keys());

  return (
    <div data-testid="ef-trend-chart" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Efficiency Factor Trend
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
            />
            <Tooltip
              labelFormatter={formatDate}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />

            {/* Scatter dots per sport */}
            {sports.map((sport) => (
              <Scatter
                key={sport}
                dataKey={`ef_${sport}`}
                name={sport}
                fill={getSportColor(sport)}
                shape="circle"
                r={4}
              />
            ))}

            {/* Trend line */}
            <Line
              type="monotone"
              dataKey="efTrend"
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
