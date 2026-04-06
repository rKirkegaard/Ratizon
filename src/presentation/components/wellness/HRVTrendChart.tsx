import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import type { WellnessDaily } from "@/domain/types/wellness.types";

interface HRVTrendChartProps {
  history: WellnessDaily[];
  baseline: number | null;
  baselineSd: number | null;
  isLoading: boolean;
}

interface ChartPoint {
  date: string;
  dateLabel: string;
  hrv: number | null;
  status: "green" | "red" | "neutral";
}

function ChartSkeleton() {
  return (
    <div
      data-testid="hrv-trend-chart-skeleton"
      className="h-56 animate-pulse rounded-lg bg-muted"
    />
  );
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || payload.hrv == null) return null;
  const fill =
    payload.status === "green"
      ? "#28CF59"
      : payload.status === "red"
        ? "#D32F2F"
        : "var(--muted-foreground)";
  return <circle cx={cx} cy={cy} r={3.5} fill={fill} stroke="none" />;
}

export default function HRVTrendChart({
  history,
  baseline,
  baselineSd,
  isLoading,
}: HRVTrendChartProps) {
  if (isLoading) return <ChartSkeleton />;

  const data: ChartPoint[] = history
    .filter((d) => d.hrvMssd != null)
    .map((d) => {
      let status: "green" | "red" | "neutral" = "neutral";
      if (baseline != null && baselineSd != null && d.hrvMssd != null) {
        if (d.hrvMssd >= baseline - baselineSd) status = "green";
        else status = "red";
      }
      return {
        date: d.date,
        dateLabel: new Date(d.date).toLocaleDateString("da-DK", {
          day: "numeric",
          month: "short",
        }),
        hrv: d.hrvMssd,
        status,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (data.length === 0) {
    return (
      <div
        data-testid="hrv-trend-chart"
        className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ingen HRV-data tilgaengelig.
        </p>
      </div>
    );
  }

  const hrvValues = data.map((d) => d.hrv).filter((v): v is number => v != null);
  const minHrv = Math.max(0, Math.min(...hrvValues) - 10);
  const maxHrv = Math.max(...hrvValues) + 10;

  const bandLow = baseline != null && baselineSd != null ? baseline - baselineSd : undefined;
  const bandHigh = baseline != null && baselineSd != null ? baseline + baselineSd : undefined;

  return (
    <div data-testid="hrv-trend-chart" className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">HRV Trend (30 dage)</h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minHrv, maxHrv]}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              width={35}
              unit=" ms"
            />
            <Tooltip cursor={false}
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(val: number) => [`${Math.round(val)} ms`, "HRV"]}
            />
            {/* Baseline band */}
            {bandLow != null && bandHigh != null && (
              <ReferenceArea
                y1={bandLow}
                y2={bandHigh}
                fill="#28CF59"
                fillOpacity={0.1}
                strokeDasharray="3 3"
                stroke="#28CF59"
                strokeOpacity={0.3}
              />
            )}
            <Line
              type="monotone"
              dataKey="hrv"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={<CustomDot />}
              connectNulls
              name="HRV"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
