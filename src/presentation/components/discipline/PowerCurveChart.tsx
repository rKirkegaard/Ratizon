import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useAthleteStore } from "@/application/stores/athleteStore";
import type { PowerCurvePoint } from "@/application/hooks/analytics/useCyclingAnalytics";

interface PowerCurveChartProps {
  data: PowerCurvePoint[];
  ftp?: number | null;
}

/** Map duration seconds to display labels for log-scale-like x axis */
const KEY_DURATIONS = [5, 30, 60, 300, 1200, 3600];
const KEY_LABELS: Record<number, string> = {
  5: "5s",
  30: "30s",
  60: "1m",
  300: "5m",
  1200: "20m",
  3600: "1t",
};

export default function PowerCurveChart({ data, ftp }: PowerCurveChartProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const bikeColor = getSportColor("bike");

  if (data.length === 0) {
    return (
      <div
        data-testid="power-curve-chart"
        className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ikke nok data til at vise power curve.
        </p>
      </div>
    );
  }

  // Use log-index for x positioning so short durations get more space
  const chartData = data.map((p) => ({
    ...p,
    logX: Math.log10(Math.max(p.durationSec, 1)),
  }));

  // Custom ticks at key durations
  const ticks = KEY_DURATIONS.filter((d) =>
    data.some((p) => p.durationSec >= d)
  ).map((d) => Math.log10(d));

  return (
    <div data-testid="power-curve-chart" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Power Curve
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="logX"
              type="number"
              domain={["auto", "auto"]}
              ticks={ticks}
              tickFormatter={(v: number) => {
                const sec = Math.round(Math.pow(10, v));
                return KEY_LABELS[sec] ?? `${sec}s`;
              }}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
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
            <Tooltip cursor={false}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(_v: number, payload: any[]) => {
                const item = payload?.[0]?.payload;
                return item?.durationLabel ?? "";
              }}
              formatter={(value: unknown, name: string) => {
                const num = typeof value === "number" ? value : null;
                return [
                  num !== null ? `${Math.round(num)} W` : "-",
                  name === "current90d" ? "Seneste 90 dage" : "All-time bedst",
                ];
              }}
            />
            {/* FTP reference line */}
            {ftp && ftp > 0 && (
              <ReferenceLine
                y={ftp}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: `FTP ${ftp}W`,
                  position: "right",
                  fontSize: 10,
                  fill: "#f59e0b",
                }}
              />
            )}
            {/* Current 90d - solid */}
            <Line
              type="monotone"
              dataKey="current90d"
              stroke={bikeColor}
              strokeWidth={2}
              dot={false}
              name="current90d"
              connectNulls
            />
            {/* All-time best - dashed */}
            <Line
              type="monotone"
              dataKey="allTimeBest"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              name="allTimeBest"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-0.5 w-4"
            style={{ backgroundColor: bikeColor }}
          />
          Seneste 90 dage
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-0.5 w-4 border-t-2 border-dashed"
            style={{ borderColor: "hsl(var(--muted-foreground))" }}
          />
          All-time bedst
        </span>
      </div>
    </div>
  );
}
