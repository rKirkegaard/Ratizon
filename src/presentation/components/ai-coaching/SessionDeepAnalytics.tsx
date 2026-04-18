import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { useSessionDeepAnalytics } from "@/application/hooks/ai-coaching/useAICoaching";
import { useAthleteStore } from "@/application/stores/athleteStore";

interface SessionDeepAnalyticsProps {
  sessionId: number;
}

const ZONE_COLORS = ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444"];
const ZONE_LABELS = ["Z1 Recovery", "Z2 Aerob", "Z3 Tempo", "Z4 Taerskel", "Z5 VO2max"];

const TREND_ICON = {
  improving: <TrendingUp size={14} className="text-emerald-400" />,
  stable: <Minus size={14} className="text-blue-400" />,
  declining: <TrendingDown size={14} className="text-red-400" />,
  insufficient: <Minus size={14} className="text-muted-foreground" />,
};

const TREND_LABEL = {
  improving: "Fremgang",
  stable: "Stabil",
  declining: "Tilbagegang",
  insufficient: "For lidt data",
};

export default function SessionDeepAnalytics({ sessionId }: SessionDeepAnalyticsProps) {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: rawData, isLoading } = useSessionDeepAnalytics(athleteId, sessionId);

  const analytics = (rawData as any)?.data ?? rawData;

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-lg border border-border bg-card" />;
  }

  if (!analytics) return null;

  const zones = analytics.zonePercentages ?? {};
  const totalZone = Object.values(zones as Record<string, number>).reduce((s: number, v) => s + (v as number), 0);

  return (
    <div data-testid="session-deep-analytics" className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-blue-400" />
        <h2 className="text-base font-semibold text-foreground">Dyb Analyse</h2>
        {analytics.comparison && (
          <div className="flex items-center gap-1 ml-auto">
            {TREND_ICON[analytics.comparison.trend as keyof typeof TREND_ICON]}
            <span className="text-xs text-muted-foreground">
              {TREND_LABEL[analytics.comparison.trend as keyof typeof TREND_LABEL]}
              {analytics.comparison.recentSimilar > 0 && ` (${analytics.comparison.recentSimilar} lignende)`}
            </span>
          </div>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {analytics.ef != null && (
          <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-center">
            <div className="text-sm font-bold text-foreground">{analytics.ef}</div>
            <div className="text-[10px] text-muted-foreground">EF</div>
          </div>
        )}
        {analytics.decoupling != null && (
          <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-center">
            <div className={`text-sm font-bold ${Math.abs(analytics.decoupling) < 5 ? "text-emerald-400" : "text-amber-400"}`}>
              {analytics.decoupling > 0 ? "+" : ""}{analytics.decoupling}%
            </div>
            <div className="text-[10px] text-muted-foreground">Decoupling</div>
          </div>
        )}
        {analytics.intensityFactor != null && (
          <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-center">
            <div className="text-sm font-bold text-foreground">{analytics.intensityFactor}</div>
            <div className="text-[10px] text-muted-foreground">IF</div>
          </div>
        )}
        {analytics.variabilityIndex != null && (
          <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-center">
            <div className="text-sm font-bold text-foreground">{analytics.variabilityIndex}</div>
            <div className="text-[10px] text-muted-foreground">VI</div>
          </div>
        )}
        {analytics.trimp != null && (
          <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-center">
            <div className="text-sm font-bold text-foreground">{analytics.trimp}</div>
            <div className="text-[10px] text-muted-foreground">TRIMP</div>
          </div>
        )}
        {analytics.hrss != null && (
          <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-center">
            <div className="text-sm font-bold text-foreground">{analytics.hrss}</div>
            <div className="text-[10px] text-muted-foreground">HRSS</div>
          </div>
        )}
      </div>

      {/* Zone distribution bar */}
      {totalZone > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Zone-fordeling</p>
          <div className="flex h-5 rounded-full overflow-hidden">
            {["z1", "z2", "z3", "z4", "z5"].map((z, i) => {
              const pct = (zones[z] as number) ?? 0;
              if (pct === 0) return null;
              return (
                <div
                  key={z}
                  style={{ width: `${pct}%`, backgroundColor: ZONE_COLORS[i] }}
                  className="h-full transition-all"
                  title={`${ZONE_LABELS[i]}: ${pct}%`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            {["z1", "z2", "z3", "z4", "z5"].map((z, i) => {
              const pct = (zones[z] as number) ?? 0;
              if (pct === 0) return <span key={z} />;
              return (
                <span key={z} className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: ZONE_COLORS[i] }} />
                  Z{i + 1} {pct}%
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison with avg EF */}
      {analytics.comparison?.avgEf && analytics.ef && (
        <div className="text-xs text-muted-foreground">
          Gennemsnit EF for lignende sessioner: <span className="text-foreground font-medium">{analytics.comparison.avgEf}</span>
          {analytics.ef > analytics.comparison.avgEf
            ? <span className="text-emerald-400 ml-1">(+{((analytics.ef - analytics.comparison.avgEf) / analytics.comparison.avgEf * 100).toFixed(0)}%)</span>
            : analytics.ef < analytics.comparison.avgEf
            ? <span className="text-red-400 ml-1">({((analytics.ef - analytics.comparison.avgEf) / analytics.comparison.avgEf * 100).toFixed(0)}%)</span>
            : null}
        </div>
      )}
    </div>
  );
}
