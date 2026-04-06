import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { useAthleteStore } from "@/application/stores/athleteStore";
import type { CadenceBucket } from "@/application/hooks/analytics/useRunningAnalytics";

interface CadenceHistogramProps {
  data: CadenceBucket[];
}

export default function CadenceHistogram({ data }: CadenceHistogramProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const runColor = getSportColor("run");

  if (data.length === 0) {
    return (
      <div
        data-testid="cadence-histogram"
        className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ikke nok data til at vise kadence-fordeling.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="cadence-histogram" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Kadencefordeling
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="spm"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v: number) => `${v}`}
              label={{
                value: "spm",
                position: "insideBottomRight",
                offset: -5,
                fontSize: 11,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip cursor={false}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, "Tid"]}
              labelFormatter={(label: number) => `${label}-${label + 5} spm`}
            />
            {/* Green optimal zone 175-185 */}
            <ReferenceArea
              x1={175}
              x2={185}
              fill="#22c55e"
              fillOpacity={0.1}
              stroke="#22c55e"
              strokeOpacity={0.3}
            />
            {/* Reference line at 180 spm */}
            <ReferenceLine
              x={180}
              stroke="#22c55e"
              strokeDasharray="4 4"
              label={{
                value: "180",
                position: "top",
                fontSize: 10,
                fill: "#22c55e",
              }}
            />
            <Bar dataKey="pctTime" fill={runColor} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
