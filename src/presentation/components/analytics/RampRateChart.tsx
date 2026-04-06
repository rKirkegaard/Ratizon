import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Cell,
} from "recharts";
import type { RampRatePoint } from "@/application/hooks/analytics/useAnalytics";

interface RampRateChartProps {
  points: RampRatePoint[];
}

function getRampColor(pct: number): string {
  const abs = Math.abs(pct);
  if (abs <= 10) return "#28CF59";
  if (abs <= 15) return "#F6D74A";
  return "#D32F2F";
}

export default function RampRateChart({ points }: RampRateChartProps) {
  if (points.length === 0) {
    return (
      <div
        data-testid="ramp-rate-chart"
        className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ingen ramp rate-data tilgaengelig.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="ramp-rate-chart" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Ramp Rate (ugentlig belastningsaendring)
      </h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

            {/* Reference zones */}
            <ReferenceArea
              y1={-10}
              y2={10}
              fill="#28CF59"
              fillOpacity={0.06}
              label={{ value: "Sikker", position: "insideTopRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <ReferenceArea
              y1={10}
              y2={15}
              fill="#F6D74A"
              fillOpacity={0.06}
            />
            <ReferenceArea
              y1={-15}
              y2={-10}
              fill="#F6D74A"
              fillOpacity={0.06}
            />
            <ReferenceArea
              y1={15}
              y2={30}
              fill="#D32F2F"
              fillOpacity={0.06}
              label={{ value: "Risiko", position: "insideTopRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />

            <XAxis
              dataKey="weekStart"
              tickFormatter={(v: string) => {
                if (!v) return "";
                const d = new Date(v);
                return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
              }}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip cursor={false}
              formatter={(value: number) => [`${value.toFixed(1)}%`, "Ramp Rate"]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Bar activeBar={{ fillOpacity: 0.7, stroke: "hsl(var(--foreground))", strokeWidth: 1 }} dataKey="rampRatePct" name="Ramp Rate" radius={[4, 4, 0, 0]}>
              {points.map((entry, index) => (
                <Cell key={index} fill={getRampColor(entry.rampRatePct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
