import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAthleteStore } from "@/application/stores/athleteStore";
import type { CyclingZoneMonth } from "@/application/hooks/analytics/useCyclingAnalytics";

interface CyclingZoneChartProps {
  data: CyclingZoneMonth[];
}

const ZONE_KEYS = ["z1", "z2", "z3", "z4", "z5"] as const;
const ZONE_LABELS: Record<string, string> = {
  z1: "Zone 1",
  z2: "Zone 2",
  z3: "Zone 3",
  z4: "Zone 4",
  z5: "Zone 5",
};

export default function CyclingZoneChart({ data }: CyclingZoneChartProps) {
  const { zoneColors } = useAthleteStore();

  const colorMap: Record<string, string> = {
    z1: zoneColors.zone1,
    z2: zoneColors.zone2,
    z3: zoneColors.zone3,
    z4: zoneColors.zone4,
    z5: zoneColors.zone5,
  };

  if (data.length === 0) {
    return (
      <div
        data-testid="cycling-zone-chart"
        className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ikke nok data til at vise zone-fordeling.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="cycling-zone-chart" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Maanedlig zonefordeling
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="monthName"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v: number) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip cursor={false}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)}%`,
                ZONE_LABELS[name] ?? name,
              ]}
            />
            <Legend
              formatter={(value: string) => ZONE_LABELS[value] ?? value}
              wrapperStyle={{ fontSize: 11 }}
            />
            {ZONE_KEYS.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="zones"
                fill={colorMap[key]}
                radius={key === "z5" ? [2, 2, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
