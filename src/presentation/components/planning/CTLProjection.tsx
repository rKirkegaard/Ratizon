import { useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";

interface CTLPoint {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

interface ChartPoint {
  date: string;
  actualCTL: number | null;
  actualATL: number | null;
  actualTSB: number | null;
  projectedCTL: number | null;
}

interface PhaseInfo {
  phaseType: string;
  startDate: string;
  endDate: string;
  ctlTarget: number | null;
}

interface CTLProjectionProps {
  ctlTimeSeries: CTLPoint[];
  targetCTL: number;
  derivedCTL?: number | null;
  targetDate: string | null;
  phases?: PhaseInfo[];
  isLoading: boolean;
  onRecalculate?: () => void;
  isRecalculating?: boolean;
}

function buildChartData(
  timeSeries: CTLPoint[],
  targetCTL: number,
  targetDate: string | null,
): ChartPoint[] {
  const points: ChartPoint[] = [];

  // Real historical data
  for (const p of timeSeries) {
    points.push({
      date: p.date,
      actualCTL: Math.round(p.ctl),
      actualATL: Math.round(p.atl),
      actualTSB: Math.round(p.tsb),
      projectedCTL: null,
    });
  }

  // Get last values as starting point
  const last = timeSeries.length > 0 ? timeSeries[timeSeries.length - 1] : null;
  const lastDate = last?.date ?? null;

  if (lastDate && last) {
    const CTL_TAU = 42; // CTL decay constant (days)
    const ATL_TAU = 7;  // ATL decay constant (days)
    let ctl = last.ctl;
    let atl = last.atl;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastD = new Date(lastDate);
    lastD.setHours(0, 0, 0, 0);
    const daysToToday = Math.ceil((today.getTime() - lastD.getTime()) / (1000 * 60 * 60 * 24));

    // Decay CTL/ATL/TSB from last data point to today (no training assumed)
    for (let i = 1; i <= daysToToday; i++) {
      ctl *= Math.exp(-1 / CTL_TAU);
      atl *= Math.exp(-1 / ATL_TAU);
      const d = new Date(lastD);
      d.setDate(d.getDate() + i);
      points.push({
        date: d.toISOString().split("T")[0],
        actualCTL: Math.round(ctl),
        actualATL: Math.round(atl),
        actualTSB: Math.round(ctl - atl),
        projectedCTL: null,
      });
    }

    // Bridge point: connect actual CTL line to projection line
    const currentCTL = ctl;
    if (targetDate) {
      const todayStr = today.toISOString().split("T")[0];
      points.push({
        date: todayStr,
        actualCTL: Math.round(currentCTL),
        actualATL: null,
        actualTSB: null,
        projectedCTL: Math.round(currentCTL),
      });

      // Project CTL forward using exponential PMC model
      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);
      const totalDays = Math.max(
        1,
        Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const daysToProject = Math.min(totalDays, 365);

      const CTL_DECAY = Math.exp(-1 / 42);
      const targetWeeklyTSS = targetCTL * 7;
      const currentWeeklyTSS = currentCTL * 7;
      let projCtl = currentCTL;

      for (let i = 1; i <= daysToProject; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const rampRatio = Math.min(1, i / daysToProject);
        const dailyTSS = (currentWeeklyTSS + (targetWeeklyTSS - currentWeeklyTSS) * rampRatio) / 7;
        projCtl = projCtl * CTL_DECAY + dailyTSS * (1 - CTL_DECAY);
        points.push({
          date: d.toISOString().split("T")[0],
          actualCTL: null,
          actualATL: null,
          actualTSB: null,
          projectedCTL: Math.round(projCtl),
        });
      }
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
    payload: ChartPoint;
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
            <span className="inline-block w-16 font-medium text-blue-400">CTL</span>
            <span className="text-gray-200">{data.actualCTL}</span>
          </p>
        )}
        {data.actualATL !== null && (
          <p>
            <span className="inline-block w-16 font-medium text-rose-400">ATL</span>
            <span className="text-gray-200">{data.actualATL}</span>
          </p>
        )}
        {data.actualTSB !== null && (
          <p>
            <span className="inline-block w-16 font-medium text-amber-400">TSB</span>
            <span className="text-gray-200">{data.actualTSB}</span>
          </p>
        )}
        {data.projectedCTL !== null && data.actualCTL === null && (
          <p>
            <span className="inline-block w-16 font-medium text-emerald-400">Projektion</span>
            <span className="text-gray-200">{data.projectedCTL}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export default function CTLProjection({
  ctlTimeSeries,
  targetCTL,
  derivedCTL,
  targetDate,
  phases,
  isLoading,
  onRecalculate,
  isRecalculating,
}: CTLProjectionProps) {
  const effectiveCTL = derivedCTL ?? targetCTL;
  if (isLoading) {
    return (
      <div
        data-testid="ctl-projection"
        className="h-80 animate-pulse rounded-lg border border-border/50 bg-muted"
      />
    );
  }

  if (ctlTimeSeries.length === 0 && targetCTL === 0) {
    return (
      <div
        data-testid="ctl-projection"
        className="flex h-80 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ikke nok data til CTL-projektion. Upload traeninger for at se trenden.
        </p>
      </div>
    );
  }

  const PERIODS = [
    { value: 90, label: "3 mdr" },
    { value: 180, label: "6 mdr" },
    { value: 365, label: "12 mdr" },
    { value: 9999, label: "Al tid" },
  ];
  const [periodDays, setPeriodDays] = useState(180);

  const lastCTL = ctlTimeSeries.length > 0 ? Math.round(ctlTimeSeries[ctlTimeSeries.length - 1].ctl) : 0;

  // Filter historical data by selected period
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - periodDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const filteredTimeSeries = periodDays >= 9999
    ? ctlTimeSeries
    : ctlTimeSeries.filter((p) => p.date >= cutoffStr);

  const rawChartData = buildChartData(filteredTimeSeries, effectiveCTL, targetDate);
  const chartData = rawChartData.map((p) => ({
    ...p,
    tsbPositive: p.actualTSB !== null && p.actualTSB >= 0 ? p.actualTSB : 0,
    tsbNegative: p.actualTSB !== null && p.actualTSB < 0 ? p.actualTSB : 0,
  }));
  const tsbValues = rawChartData.filter((p) => p.actualTSB !== null).map((p) => p.actualTSB!);
  const minTsb = Math.min(...tsbValues, -30);
  const maxTsb = Math.max(...tsbValues, 40);

  return (
    <div data-testid="ctl-projection" className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            CTL Projektion mod maaldag
          </h3>
          {onRecalculate && (
            <button
              data-testid="recalculate-pmc"
              onClick={onRecalculate}
              disabled={isRecalculating}
              title="Genberegn PMC"
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRecalculating ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriodDays(p.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  periodDays === p.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>CTL: <strong className="text-foreground">{lastCTL}</strong></span>
            {effectiveCTL > 0 && <span>{derivedCTL ? "Krav" : "Maal"}: <strong className={derivedCTL ? "text-emerald-400" : "text-foreground"}>{effectiveCTL}</strong></span>}
            {effectiveCTL > 0 && lastCTL > 0 && (
              <span className={effectiveCTL > lastCTL ? "text-yellow-400" : "text-green-400"}>
                {effectiveCTL > lastCTL ? `Mangler ${effectiveCTL - lastCTL}` : "Paa maal!"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="ctlProjTsbPosGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#28CF59" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#28CF59" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="ctlProjTsbNegGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D32F2F" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#D32F2F" stopOpacity={0.4} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

            {/* Zone backgrounds */}
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
            <RechartsTooltip content={<CTLTooltip />} />

            {/* TSB area fills */}
            <Area
              type="monotone"
              dataKey="tsbPositive"
              fill="url(#ctlProjTsbPosGrad)"
              stroke="none"
            />
            <Area
              type="monotone"
              dataKey="tsbNegative"
              fill="url(#ctlProjTsbNegGrad)"
              stroke="none"
            />

            {/* Derived CTL corridor */}
            {derivedCTL && derivedCTL > 0 && (
              <ReferenceArea
                y1={derivedCTL - 5}
                y2={derivedCTL + 5}
                fill="#10B981"
                fillOpacity={0.06}
              />
            )}

            {/* Phase boundary markers */}
            {phases?.map((p) => (
              <ReferenceLine
                key={p.startDate}
                x={p.startDate.split("T")[0]}
                stroke="hsl(var(--border))"
                strokeDasharray="2 4"
              />
            ))}

            {effectiveCTL > 0 && (
              <ReferenceLine
                y={effectiveCTL}
                stroke={derivedCTL ? "#10B981" : "#F59E0B"}
                strokeDasharray="6 3"
                label={{
                  value: `${derivedCTL ? "Krav" : "Maal"}: ${effectiveCTL}`,
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
              name="CTL (Fitness)"
            />
            <Line
              type="monotone"
              dataKey="actualATL"
              stroke="#EF4444"
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
              name="ATL (Traethed)"
            />
            <Line
              type="monotone"
              dataKey="actualTSB"
              stroke="#28CF59"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              connectNulls={false}
              name="TSB (Form)"
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="mr-1.5 inline-block h-2 w-4 rounded" style={{ backgroundColor: "#3B82F6" }} />
          CTL (Fitness)
        </span>
        <span>
          <span className="mr-1.5 inline-block h-2 w-4 rounded" style={{ backgroundColor: "#F43F5E" }} />
          ATL (Traethed)
        </span>
        <span>
          <span className="mr-1.5 inline-block h-2 w-4 rounded" style={{ backgroundColor: "#F59E0B" }} />
          TSB (Form)
        </span>
        <span>
          <span className="mr-1.5 inline-block h-2 w-4 rounded" style={{ backgroundColor: "#28CF59" }} />
          Projiceret CTL
        </span>
      </div>
    </div>
  );
}
