import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { EquipmentMonthlyUsage } from "@/domain/types/equipment.types";

interface MonthlyUsageChartProps {
  data: EquipmentMonthlyUsage[];
  isLoading?: boolean;
}

export default function MonthlyUsageChart({ data, isLoading }: MonthlyUsageChartProps) {
  if (isLoading) return <div className="h-48 animate-pulse rounded-lg bg-muted" />;
  if (!data || data.length === 0) return <p className="text-xs text-muted-foreground py-4">Ingen brugsdata endnu.</p>;

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.month + "-01").toLocaleDateString("da-DK", { month: "short", year: "2-digit" }),
  }));

  return (
    <div data-testid="monthly-usage-chart" className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted}>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} km`} />
          <Tooltip
            cursor={false}
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
            formatter={(v: number) => [`${v.toFixed(1)} km`, "Distance"]}
          />
          <Bar dataKey="distanceKm" fill="#3A7BFF" radius={[4, 4, 0, 0]} activeBar={{ fillOpacity: 0.7, stroke: "hsl(var(--foreground))", strokeWidth: 1 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
