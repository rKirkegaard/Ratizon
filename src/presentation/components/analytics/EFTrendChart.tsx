import { useState, useMemo } from "react";
import {
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import type { EFPoint } from "@/application/hooks/analytics/useAnalytics";
import { linearRegression, classifyTrend, type TrendSummary } from "@/domain/utils/trendUtils";

interface EFTrendChartProps {
  points: EFPoint[];
  trendLine: { date: string; ef: number }[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

const TREND_TEXT: Record<string, string> = {
  improving: "EF-trenden er stigende — du producerer mere output pr. hjerteslag. Din aerobe effektivitet forbedres.",
  stable: "EF-trenden er stabil — din aerobe effektivitet er konstant.",
  declining: "EF-trenden er faldende — du producerer mindre output pr. hjerteslag. Det kan skyldes traethed, varme eller detraining.",
};

const TREND_ICON: Record<string, typeof TrendingUp> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

const TREND_COLOR: Record<string, string> = {
  improving: "text-emerald-400",
  stable: "text-muted-foreground",
  declining: "text-red-400",
};

const SPORT_LABELS: Record<string, string> = { bike: "Cykel", run: "Loeb", swim: "Svoem" };

export default function EFTrendChart({ points }: EFTrendChartProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);

  // Group by sport
  const sportGroups = useMemo(() => {
    const groups = new Map<string, { date: string; ef: number; dateTs: number }[]>();
    for (const p of points) {
      const ts = new Date(p.date).getTime();
      if (!groups.has(p.sport)) groups.set(p.sport, []);
      groups.get(p.sport)!.push({ date: p.date, ef: p.ef, dateTs: ts });
    }
    return groups;
  }, [points]);

  const sports = useMemo(() => Array.from(sportGroups.keys()), [sportGroups]);

  // Default to sport with most sessions
  const defaultSport = useMemo(() =>
    sports.reduce((a, b) =>
      (sportGroups.get(a)?.length ?? 0) >= (sportGroups.get(b)?.length ?? 0) ? a : b
    , sports[0] ?? "bike")
  , [sports, sportGroups]);

  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const activeSport = selectedSport ?? defaultSport;

  if (points.length === 0) {
    return (
      <div
        data-testid="ef-trend-chart"
        className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ikke nok data til at vise EF-trend.
        </p>
      </div>
    );
  }

  // Get data for active sport
  const sportPoints = sportGroups.get(activeSport) ?? [];
  const sorted = [...sportPoints].sort((a, b) => a.dateTs - b.dateTs);

  // Compute trend line
  let summary: TrendSummary | null = null;
  const chartData = sorted.map((p) => ({ date: p.date, ef: p.ef, trend: undefined as number | undefined }));

  if (sorted.length >= 2) {
    const regInput = sorted.map((p) => ({ x: p.dateTs, y: p.ef }));
    const { predictions } = linearRegression(regInput);
    sorted.forEach((_, i) => { chartData[i].trend = Math.round(predictions[i] * 1000) / 1000; });
    summary = classifyTrend(predictions[0], predictions[predictions.length - 1], sorted.length);
  }

  const sportColor = getSportColor(activeSport);

  return (
    <div data-testid="ef-trend-chart" className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Efficiency Factor Trend
        </h3>
        {/* Sport toggle */}
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
          {sports.map((sport) => (
            <button
              key={sport}
              data-testid={`ef-sport-toggle-${sport}`}
              onClick={() => setSelectedSport(sport)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeSport === sport
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {SPORT_LABELS[sport] ?? sport}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
            <Tooltip cursor={false}
              labelFormatter={formatDate}
              formatter={(value: number) => [value.toFixed(3), "EF"]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />

            <Scatter
              dataKey="ef"
              name={SPORT_LABELS[activeSport] ?? activeSport}
              fill={sportColor}
              shape="circle"
              r={4}
            />

            <Line
              type="monotone"
              dataKey="trend"
              stroke={sportColor}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              connectNulls
              name="Trend"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Trend summary */}
      {summary && (
        <div className="mt-3 flex items-start gap-2 text-xs">
          {(() => {
            const Icon = TREND_ICON[summary.direction];
            const color = TREND_COLOR[summary.direction];
            return (
              <>
                <Icon size={14} className={`mt-0.5 shrink-0 ${color}`} />
                <div className="space-y-0.5">
                  <p className={color}>
                    {summary.changePct > 0 ? "+" : ""}{summary.changePct}% over perioden
                    <span className="text-muted-foreground"> ({summary.pointCount} datapunkter)</span>
                  </p>
                  <p className="text-muted-foreground">{TREND_TEXT[summary.direction]}</p>
                  {summary.pointCount < 6 && (
                    <p className="flex items-center gap-1 text-amber-400">
                      <Info size={10} /> For faa datapunkter til en paalidelig trend.
                    </p>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
