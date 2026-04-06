import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import type { MonotonyPoint } from "@/application/hooks/analytics/useAnalytics";

interface MonotonyStrainChartProps {
  points: MonotonyPoint[];
}

export default function MonotonyStrainChart({ points }: MonotonyStrainChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  if (points.length === 0) {
    return (
      <div
        data-testid="monotony-strain-chart"
        className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ingen monotoni/strain-data tilgaengelig.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="monotony-strain-chart" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Monotoni & Strain
      </h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="weekStart"
              tickFormatter={(v: string) => {
                if (!v) return "";
                const d = new Date(v);
                return `${d.getDate()}/${d.getMonth() + 1}`;
              }}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              yAxisId="monotony"
              orientation="left"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{ value: "Monotoni", angle: -90, position: "insideLeft", fontSize: 10 }}
            />
            <YAxis
              yAxisId="strain"
              orientation="right"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{ value: "Strain", angle: 90, position: "insideRight", fontSize: 10 }}
            />
            <Tooltip cursor={false}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
                color: "hsl(var(--foreground))",
              }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number, name: string) => [
                value.toFixed(2),
                name === "monotony" ? "Monotoni" : "Strain",
              ]}
            />
            <Legend
              wrapperStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }}
              onMouseEnter={(e: any) => setHoveredKey(e.dataKey || e.value)}
              onMouseLeave={() => setHoveredKey(null)}
            />
            <ReferenceLine
              yAxisId="monotony"
              y={2.0}
              stroke="#D32F2F"
              strokeDasharray="4 2"
              label={{ value: "Graense (2.0)", position: "insideTopRight", fontSize: 10, fill: "#D32F2F" }}
            />
            <Bar
              yAxisId="monotony"
              dataKey="monotony"
              name="Monotoni"
              fill="#3B82F6"
              fillOpacity={hoveredKey === null ? 0.8 : hoveredKey === "monotony" ? 1 : 0.15}
              radius={[4, 4, 0, 0]}
              barSize={20}
              activeBar={{ fillOpacity: 0.7, stroke: "hsl(var(--foreground))", strokeWidth: 1 }}
            />
            <Bar
              yAxisId="strain"
              dataKey="strain"
              name="Strain"
              fill="#F59E0B"
              fillOpacity={hoveredKey === null ? 0.8 : hoveredKey === "strain" ? 1 : 0.15}
              radius={[4, 4, 0, 0]}
              barSize={20}
              activeBar={{ fillOpacity: 0.7, stroke: "hsl(var(--foreground))", strokeWidth: 1 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
