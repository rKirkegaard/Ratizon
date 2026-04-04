import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import type { PMCPoint } from "@/application/hooks/analytics/useAnalytics";

interface PMCChartProps {
  points: PMCPoint[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    payload: PMCPoint;
  }>;
}

function PMCTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-[hsl(220,20%,14%)] px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-bold text-white">
        {formatDate(data.date)}
      </p>
      <div className="space-y-0.5 text-xs">
        <p>
          <span className="inline-block w-8 font-medium text-blue-400">CTL</span>
          <span className="text-gray-200">{Math.round(data.ctl)}</span>
        </p>
        <p>
          <span className="inline-block w-8 font-medium text-red-400">ATL</span>
          <span className="text-gray-200">{Math.round(data.atl)}</span>
        </p>
        <p>
          <span className="inline-block w-8 font-medium text-emerald-400">TSB</span>
          <span className="text-gray-200">{Math.round(data.tsb)}</span>
        </p>
      </div>
    </div>
  );
}

export default function PMCChart({ points }: PMCChartProps) {
  if (points.length === 0) {
    return (
      <div
        data-testid="pmc-chart"
        className="flex h-80 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ikke nok data til at vise PMC-diagrammet.
        </p>
      </div>
    );
  }

  // Split TSB into positive (form) and negative (fatigue) for area coloring
  const chartData = points.map((p) => ({
    ...p,
    tsbPositive: p.tsb >= 0 ? p.tsb : 0,
    tsbNegative: p.tsb < 0 ? p.tsb : 0,
  }));

  const tsbValues = points.map((p) => p.tsb);
  const minTsb = Math.min(...tsbValues, -30);
  const maxTsb = Math.max(...tsbValues, 40);

  return (
    <div data-testid="pmc-chart" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Performance Management Chart
      </h3>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="tsbPositiveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#28CF59" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#28CF59" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="tsbNegativeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D32F2F" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#D32F2F" stopOpacity={0.4} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

            {/* Zone backgrounds on TSB axis */}
            <ReferenceArea
              y1={25}
              y2={maxTsb + 10}
              fill="#EF4444"
              fillOpacity={0.04}
              label={{ value: "Dekonditionering", position: "insideTopLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <ReferenceArea
              y1={5}
              y2={25}
              fill="#28CF59"
              fillOpacity={0.06}
              label={{ value: "Optimal", position: "insideTopLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <ReferenceArea
              y1={-10}
              y2={5}
              fill="#3B82F6"
              fillOpacity={0.04}
              label={{ value: "Frisk", position: "insideTopLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <ReferenceArea
              y1={minTsb - 10}
              y2={-10}
              fill="#EF4444"
              fillOpacity={0.06}
              label={{ value: "Overtraening", position: "insideBottomLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />

            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              domain={[minTsb - 10, maxTsb + 10]}
            />
            <RechartsTooltip content={<PMCTooltip />} />

            {/* TSB area */}
            <Area
              type="monotone"
              dataKey="tsbPositive"
              fill="url(#tsbPositiveGrad)"
              stroke="none"
            />
            <Area
              type="monotone"
              dataKey="tsbNegative"
              fill="url(#tsbNegativeGrad)"
              stroke="none"
            />

            {/* CTL line - thick blue */}
            <Line
              type="monotone"
              dataKey="ctl"
              stroke="#3B82F6"
              strokeWidth={2.5}
              dot={false}
              name="CTL"
            />

            {/* ATL line - red */}
            <Line
              type="monotone"
              dataKey="atl"
              stroke="#EF4444"
              strokeWidth={1.5}
              dot={false}
              name="ATL"
            />

            {/* TSB line */}
            <Line
              type="monotone"
              dataKey="tsb"
              stroke="#28CF59"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              name="TSB"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="mr-1.5 inline-block h-2 w-4 rounded" style={{ backgroundColor: "#3B82F6" }} />
          CTL = Chronic Training Load (Fitness)
        </span>
        <span>
          <span className="mr-1.5 inline-block h-2 w-4 rounded" style={{ backgroundColor: "#EF4444" }} />
          ATL = Acute Training Load (Traethed)
        </span>
        <span>
          <span className="mr-1.5 inline-block h-2 w-4 rounded" style={{ backgroundColor: "#28CF59" }} />
          TSB = Training Stress Balance (Form)
        </span>
        <span className="text-muted-foreground/70">Optimal race-zone: TSB 5-25</span>
      </div>
    </div>
  );
}
