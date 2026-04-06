import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { WeeklyReportDiscipline, WeeklyReportZone } from "@/application/hooks/analytics/useAnalytics";

const ZONE_COLORS = [
  "var(--zone-1)",
  "var(--zone-2)",
  "var(--zone-3)",
  "var(--zone-4)",
  "var(--zone-5)",
];

interface WeeklyZoneChartProps {
  zones: WeeklyReportZone[];
  disciplines: WeeklyReportDiscipline[];
  totalDurationSeconds: number;
  selectedSport: string | null;
}

function formatMinutesLabel(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}t ${m}m`;
  }
  return `${Math.round(minutes)}m`;
}

export default function WeeklyZoneChart({
  zones,
  disciplines,
  totalDurationSeconds,
  selectedSport,
}: WeeklyZoneChartProps) {
  // If a sport is selected, use that sport's zones and duration
  let activeZones = zones;
  let activeDuration = totalDurationSeconds;

  if (selectedSport) {
    const disc = disciplines.find((d) => d.sport === selectedSport);
    if (disc) {
      activeZones = disc.zones;
      activeDuration = disc.durationSeconds;
    }
  }

  const durationMin = activeDuration / 60;

  // Convert pct to minutes
  const chartData = activeZones.map((z) => ({
    zone: `Zone ${z.zone}`,
    minutter: Math.round((z.pct / 100) * durationMin * 10) / 10,
  }));

  if (chartData.length === 0) {
    return (
      <div
        data-testid="weekly-zone-chart"
        className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ingen zonedata tilgaengelig.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="weekly-zone-chart" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Zonefordeling{selectedSport ? ` (${selectedSport})` : ""}
      </h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="zone"
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v: number) => formatMinutesLabel(v)}
            />
            <Tooltip cursor={false}
              formatter={(value: number) => [`${formatMinutesLabel(value)}`, "Tid"]}
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
            <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <Bar activeBar={{ fillOpacity: 0.7, stroke: "hsl(var(--foreground))", strokeWidth: 1 }} dataKey="minutter" name="Minutter" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={ZONE_COLORS[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
