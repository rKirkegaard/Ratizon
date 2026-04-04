import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface CTLProjectionPoint {
  date: string;
  actualCTL: number | null;
  projectedCTL: number | null;
}

interface CTLProjectionProps {
  currentCTL: number;
  targetCTL: number;
  targetDate: string | null;
  isLoading: boolean;
}

function generateProjectionData(
  currentCTL: number,
  targetCTL: number,
  targetDate: string | null
): CTLProjectionPoint[] {
  const points: CTLProjectionPoint[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Generate 12 weeks of "actual" history (simulated decay from current)
  for (let i = -84; i <= 0; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    // Simulate a gentle ramp-up to current CTL
    const ratio = (i + 84) / 84;
    const historyCTL = Math.round(currentCTL * 0.5 + currentCTL * 0.5 * ratio);
    points.push({
      date: d.toISOString().split("T")[0],
      actualCTL: historyCTL,
      projectedCTL: null,
    });
  }

  // Generate projection to target date
  if (targetDate) {
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const totalDays = Math.max(
      1,
      Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    const daysToProject = Math.min(totalDays, 365);

    for (let i = 1; i <= daysToProject; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const ratio = i / daysToProject;
      const projected = Math.round(currentCTL + (targetCTL - currentCTL) * ratio);
      points.push({
        date: d.toISOString().split("T")[0],
        actualCTL: null,
        projectedCTL: projected,
      });
    }
  }

  return points;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number | null;
    dataKey: string;
    payload: CTLProjectionPoint;
  }>;
}

function CTLTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-[hsl(220,20%,14%)] px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-bold text-white">{formatDate(data.date)}</p>
      <div className="space-y-0.5 text-xs">
        {data.actualCTL !== null && (
          <p>
            <span className="inline-block w-16 font-medium text-blue-400">
              Aktuel CTL
            </span>
            <span className="text-gray-200">{data.actualCTL}</span>
          </p>
        )}
        {data.projectedCTL !== null && (
          <p>
            <span className="inline-block w-16 font-medium text-emerald-400">
              Projektion
            </span>
            <span className="text-gray-200">{data.projectedCTL}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export default function CTLProjection({
  currentCTL,
  targetCTL,
  targetDate,
  isLoading,
}: CTLProjectionProps) {
  if (isLoading) {
    return (
      <div
        data-testid="ctl-projection"
        className="h-80 animate-pulse rounded-lg border border-border/50 bg-muted"
      />
    );
  }

  if (currentCTL === 0 && targetCTL === 0) {
    return (
      <div
        data-testid="ctl-projection"
        className="flex h-80 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ikke nok data til CTL-projektion. Traen mere for at se trenden.
        </p>
      </div>
    );
  }

  const chartData = generateProjectionData(currentCTL, targetCTL, targetDate);

  return (
    <div data-testid="ctl-projection" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        CTL Projektion mod maaldag
      </h3>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              domain={["auto", "auto"]}
            />
            <RechartsTooltip content={<CTLTooltip />} />

            {targetCTL > 0 && (
              <ReferenceLine
                y={targetCTL}
                stroke="#F59E0B"
                strokeDasharray="6 3"
                label={{
                  value: `Maal: ${targetCTL}`,
                  position: "right",
                  fontSize: 11,
                  fill: "#F59E0B",
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="actualCTL"
              stroke="#3B82F6"
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
              name="Aktuel CTL"
            />
            <Line
              type="monotone"
              dataKey="projectedCTL"
              stroke="#28CF59"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls={false}
              name="Projektion"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span
            className="mr-1.5 inline-block h-2 w-4 rounded"
            style={{ backgroundColor: "#3B82F6" }}
          />
          Aktuel CTL
        </span>
        <span>
          <span
            className="mr-1.5 inline-block h-2 w-4 rounded"
            style={{ backgroundColor: "#28CF59" }}
          />
          Projiceret CTL
        </span>
        <span>
          <span
            className="mr-1.5 inline-block h-2 w-4 rounded"
            style={{ backgroundColor: "#F59E0B" }}
          />
          Maal-CTL
        </span>
      </div>
    </div>
  );
}
