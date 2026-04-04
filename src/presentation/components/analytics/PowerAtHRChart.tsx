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
import type { PowerAtHRPoint } from "@/application/hooks/analytics/useAnalytics";

interface PowerAtHRChartProps {
  points: PowerAtHRPoint[];
  trendLine: { date: string; avgPower: number }[];
  hrMin: number;
  hrMax: number;
  onHRRangeChange: (hrMin: number, hrMax: number) => void;
}

const HR_RANGES = [
  { label: "120-140 bpm", min: 120, max: 140 },
  { label: "140-155 bpm", min: 140, max: 155 },
  { label: "155-170 bpm", min: 155, max: 170 },
  { label: "170-185 bpm", min: 170, max: 185 },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

export default function PowerAtHRChart({
  points,
  trendLine,
  hrMin,
  hrMax,
  onHRRangeChange,
}: PowerAtHRChartProps) {
  // Merge points + trend
  const allDatesSet = new Set<string>();
  for (const p of points) allDatesSet.add(p.date);
  for (const t of trendLine) allDatesSet.add(t.date);
  const allDates = Array.from(allDatesSet).sort();

  const mergedData = allDates.map((date) => {
    const entry: Record<string, unknown> = { date };
    const pMatch = points.find((p) => p.date === date);
    if (pMatch) entry.power = pMatch.avgPower;
    const tMatch = trendLine.find((t) => t.date === date);
    if (tMatch) entry.powerTrend = tMatch.avgPower;
    return entry;
  });

  return (
    <div data-testid="power-at-hr-chart" className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Watt ved HR (Cykel)
        </h3>
        <select
          data-testid="power-hr-range-select"
          className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
          value={`${hrMin}-${hrMax}`}
          onChange={(e) => {
            const [min, max] = e.target.value.split("-").map(Number);
            onHRRangeChange(min, max);
          }}
        >
          {HR_RANGES.map((r) => (
            <option key={r.label} value={`${r.min}-${r.max}`}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {points.length === 0 ? (
        <div className="flex h-52 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Ingen data for det valgte HR-interval.
          </p>
        </div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={mergedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                domain={["auto", "auto"]}
                label={{ value: "Watt", angle: -90, position: "insideLeft", fontSize: 10 }}
              />
              <Tooltip
                labelFormatter={formatDate}
                formatter={(value: number, name: string) => [
                  `${Math.round(value)} W`,
                  name === "powerTrend" ? "Trend" : "Watt",
                ]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Scatter
                dataKey="power"
                name="Watt"
                fill="var(--sport-bike)"
                shape="circle"
                r={4}
              />
              <Line
                type="monotone"
                dataKey="powerTrend"
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
      )}
    </div>
  );
}
