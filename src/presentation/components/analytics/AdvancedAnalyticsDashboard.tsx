import { TrendingUp, TrendingDown, Minus, BarChart3, Calendar, PieChart, Timer, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import { useAthleteStore } from "@/application/stores/athleteStore";

const TREND_ICON = {
  improving: <TrendingUp size={14} className="text-emerald-400" />,
  stable: <Minus size={14} className="text-blue-400" />,
  declining: <TrendingDown size={14} className="text-red-400" />,
  insufficient: <Minus size={14} className="text-muted-foreground" />,
};

export default function AdvancedAnalyticsDashboard() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);

  const { data: decRaw } = useQuery({
    queryKey: ["decoupling-trend", athleteId],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/decoupling-trend`),
    enabled: !!athleteId, staleTime: 5 * 60 * 1000,
  });
  const { data: benchRaw } = useQuery({
    queryKey: ["season-benchmark", athleteId],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/season-benchmark`),
    enabled: !!athleteId, staleTime: 5 * 60 * 1000,
  });
  const { data: balRaw } = useQuery({
    queryKey: ["discipline-balance", athleteId],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/discipline-balance`),
    enabled: !!athleteId, staleTime: 5 * 60 * 1000,
  });
  const { data: taperRaw } = useQuery({
    queryKey: ["taper-prediction", athleteId],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/taper-prediction`),
    enabled: !!athleteId, staleTime: 5 * 60 * 1000,
  });
  const { data: ageRaw } = useQuery({
    queryKey: ["training-age", athleteId],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/training-age`),
    enabled: !!athleteId, staleTime: 5 * 60 * 1000,
  });

  const dec = (decRaw as any)?.data ?? decRaw;
  const bench = (benchRaw as any)?.data ?? benchRaw;
  const bal = (balRaw as any)?.data ?? balRaw;
  const taper = (taperRaw as any)?.data ?? taperRaw;
  const age = (ageRaw as any)?.data ?? ageRaw;

  if (!athleteId) return null;

  const SPORT_LABELS: Record<string, string> = { swim: "Svoem", bike: "Cykel", run: "Loeb", strength: "Styrke" };

  return (
    <div data-testid="advanced-analytics" className="space-y-4">
      {/* Decoupling Trend (28a) */}
      {dec && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-foreground">Decoupling-trend</h2>
            {dec.trend && (
              <div className="flex items-center gap-1 ml-auto">
                {TREND_ICON[dec.trend as keyof typeof TREND_ICON]}
                <span className="text-xs text-muted-foreground">{dec.trend === "improving" ? "Forbedring" : dec.trend === "declining" ? "Tilbagegang" : dec.trend === "stable" ? "Stabil" : "For lidt data"}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-xl font-bold ${dec.avgDecoupling < 5 ? "text-emerald-400" : "text-amber-400"}`}>
                {dec.avgDecoupling}%
              </div>
              <div className="text-[10px] text-muted-foreground">Gns. decoupling</div>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>{dec.sessions?.length ?? 0} sessioner analyseret</p>
              <p className="text-[10px]">&lt;5% = god aerob base</p>
            </div>
          </div>
          {dec.sessions?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {dec.sessions.slice(-10).map((s: any, i: number) => (
                <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] ${s.decoupling < 5 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                  {s.date.slice(5)} {s.decoupling}%
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Season Benchmark (28b) */}
      {bench && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-foreground">Saeson-sammenligning</h2>
          </div>
          {bench.currentYear && bench.previousYear ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground mb-1">I aar</p>
                <p className="text-lg font-bold text-foreground">CTL {bench.currentYear.ctl}</p>
                <p className="text-xs text-muted-foreground">{bench.currentYear.weeklyHours}t/uge</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground mb-1">Sidste aar</p>
                <p className="text-lg font-bold text-muted-foreground">CTL {bench.previousYear.ctl}</p>
                <p className="text-xs text-muted-foreground">{bench.previousYear.weeklyHours}t/uge</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Utilstraekkelig data til sammenligning.</p>
          )}
          {bench.ctlDifference != null && (
            <p className={`text-xs ${bench.ctlDifference > 0 ? "text-emerald-400" : bench.ctlDifference < 0 ? "text-red-400" : "text-muted-foreground"}`}>
              {bench.ctlDifference > 0 ? "+" : ""}{bench.ctlDifference} CTL vs. sidste aar
            </p>
          )}
          <p className="text-xs text-muted-foreground">{bench.assessment}</p>
        </div>
      )}

      {/* Discipline Balance (28d) */}
      {bal && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-purple-400" />
            <h2 className="text-base font-semibold text-foreground">Disciplin-balance (4 uger)</h2>
          </div>
          <div className="space-y-2">
            {Object.entries(bal.recommended as Record<string, number>).map(([sport, rec]) => {
              const act = (bal.actual as Record<string, number>)[sport] ?? 0;
              const max = Math.max(act, rec, 1);
              return (
                <div key={sport}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-foreground">{SPORT_LABELS[sport] ?? sport}</span>
                    <span className="text-muted-foreground">{act}t / {rec}t anbefalet</span>
                  </div>
                  <div className="flex gap-1 h-3">
                    <div className="rounded-full bg-primary/60" style={{ width: `${(act / max) * 100}%` }} title={`Faktisk: ${act}t`} />
                    <div className="rounded-full bg-muted/40 border border-dashed border-muted-foreground/30" style={{ width: `${(rec / max) * 100}%` }} title={`Anbefalet: ${rec}t`} />
                  </div>
                </div>
              );
            })}
          </div>
          {bal.imbalances?.length > 0 && (
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-2">
              {bal.imbalances.map((imb: string, i: number) => (
                <p key={i} className="text-xs text-amber-400">! {imb}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Taper Prediction (28c) */}
      {taper && taper.predictedRaceDayCTL != null && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-orange-400" />
            <h2 className="text-base font-semibold text-foreground">Taper-prediktion</h2>
            <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] ${taper.confidence === "high" ? "border-emerald-500/20 text-emerald-400" : taper.confidence === "medium" ? "border-amber-500/20 text-amber-400" : "border-muted text-muted-foreground"}`}>
              {taper.confidence === "high" ? "Hoej" : taper.confidence === "medium" ? "Moderat" : "Lav"} konfidens
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
              <div className="text-lg font-bold text-foreground">{taper.predictedRaceDayCTL}</div>
              <div className="text-[10px] text-muted-foreground">Race-day CTL</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
              <div className={`text-lg font-bold ${taper.predictedTSB > 0 ? "text-emerald-400" : "text-amber-400"}`}>{taper.predictedTSB > 0 ? "+" : ""}{taper.predictedTSB}</div>
              <div className="text-[10px] text-muted-foreground">Forventet TSB</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">+{taper.estimatedPerformanceGain}%</div>
              <div className="text-[10px] text-muted-foreground">Performance gain</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{taper.note}</p>
        </div>
      )}

      {/* Training Age (28e) */}
      {age && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-teal-400" />
            <h2 className="text-base font-semibold text-foreground">Traeningsalder & Adaptation</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
              <div className="text-lg font-bold text-foreground">{age.estimatedTrainingYears} aar</div>
              <div className="text-[10px] text-muted-foreground">Est. traeningsalder</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
              <div className={`text-lg font-bold ${age.adaptationRate === "fast" ? "text-emerald-400" : age.adaptationRate === "moderate" ? "text-blue-400" : "text-amber-400"}`}>
                {age.ctlGrowthRate} CTL/uge
              </div>
              <div className="text-[10px] text-muted-foreground">Vaekstrate</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
              <div className="text-lg font-bold text-foreground">{age.dataMonths} mdr</div>
              <div className="text-[10px] text-muted-foreground">Data tilgaengelig</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{age.assessment}</p>
          <p className="text-[10px] text-muted-foreground">Forventet rate: {age.expectedRate}</p>
        </div>
      )}
    </div>
  );
}
