import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAthleteStore } from "@/application/stores/athleteStore";
import type { SportBalancePoint } from "@/application/hooks/analytics/useAnalytics";

interface SportBalanceChartProps {
  points: SportBalancePoint[];
  sports: string[];
}

export default function SportBalanceChart({ points, sports }: SportBalanceChartProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);

  if (points.length === 0 || sports.length === 0) {
    return (
      <div
        data-testid="sport-balance-chart"
        className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ingen sportbalance-data tilgaengelig.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="sport-balance-chart" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Sportbalance
      </h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={points}
            stackOffset="expand"
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="weekLabel"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip cursor={false}
              formatter={(value: number, name: string) => [
                `${(value * 100).toFixed(0)}%`,
                name,
              ]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend />
            {sports.map((sport) => (
              <Area
                key={sport}
                type="monotone"
                dataKey={sport}
                stackId="1"
                fill={getSportColor(sport)}
                stroke={getSportColor(sport)}
                fillOpacity={0.7}
                name={sport}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
