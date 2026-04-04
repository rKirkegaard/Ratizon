import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAthleteStore } from "@/application/stores/athleteStore";
import type { CadencePowerPoint } from "@/application/hooks/analytics/useCyclingAnalytics";

interface CadencePowerScatterProps {
  data: CadencePowerPoint[];
}

export default function CadencePowerScatter({ data }: CadencePowerScatterProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const bikeColor = getSportColor("bike");

  if (data.length === 0) {
    return (
      <div
        data-testid="cadence-power-scatter"
        className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ikke nok data til at vise kadence vs. effekt.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="cadence-power-scatter" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Kadence vs. Effekt
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="cadence"
              type="number"
              name="Kadence"
              unit=" rpm"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              domain={["auto", "auto"]}
              label={{
                value: "Kadence (rpm)",
                position: "insideBottomRight",
                offset: -5,
                fontSize: 11,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <YAxis
              dataKey="power"
              type="number"
              name="Effekt"
              unit=" W"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              domain={[0, "auto"]}
              label={{
                value: "Watt",
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [
                name === "Kadence" ? `${value} rpm` : `${value} W`,
                name,
              ]}
            />
            <Scatter
              data={data}
              fill={bikeColor}
              fillOpacity={0.5}
              r={3}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
