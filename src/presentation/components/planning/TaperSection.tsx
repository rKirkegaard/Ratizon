import { useState } from "react";
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
import { useGenerateTaper, type TaperPlanResult } from "@/application/hooks/planning/useTaper";
import { Loader2, TrendingDown } from "lucide-react";

interface TaperSectionProps {
  athleteId: string;
  goalId?: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

export default function TaperSection({ athleteId, goalId }: TaperSectionProps) {
  const generateMutation = useGenerateTaper(athleteId);
  const [taperWeeks, setTaperWeeks] = useState<2 | 3>(3);
  const [profile, setProfile] = useState("moderate");
  const [result, setResult] = useState<TaperPlanResult | null>(null);

  const handleGenerate = () => {
    generateMutation.mutate(
      { goalId, taperWeeks, profile },
      { onSuccess: (data: any) => setResult(data) }
    );
  };

  return (
    <div data-testid="taper-section" className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-green-400" />
          <h3 className="text-base font-semibold text-foreground">Taper-beregner</h3>
        </div>

        <div className="flex items-center gap-2">
          <select
            data-testid="taper-weeks"
            value={taperWeeks}
            onChange={(e) => setTaperWeeks(parseInt(e.target.value) as 2 | 3)}
            className="rounded border border-border bg-background px-2 py-1 text-xs"
          >
            <option value={2}>2 uger</option>
            <option value={3}>3 uger</option>
          </select>
          <select
            data-testid="taper-profile"
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="conservative">Konservativ</option>
            <option value="moderate">Moderat</option>
            <option value="aggressive">Aggressiv</option>
          </select>
          <button
            data-testid="generate-taper"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {generateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Beregn taper
          </button>
        </div>
      </div>

      {!result && !generateMutation.isPending && (
        <p className="text-sm text-muted-foreground">
          Beregn en taper-plan baseret paa din nuvaerende traening. Viser CTL/ATL/TSB projektion frem til racedag.
        </p>
      )}

      {result && (
        <>
          {/* Race day projection cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">CTL paa racedag</p>
              <p className="text-lg font-bold text-green-400">{result.raceDayProjection.ctl}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">ATL paa racedag</p>
              <p className="text-lg font-bold text-red-400">{result.raceDayProjection.atl}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">TSB (Form)</p>
              <p className={`text-lg font-bold ${result.raceDayProjection.tsb >= 0 ? "text-green-400" : "text-amber-400"}`}>
                {result.raceDayProjection.tsb > 0 ? "+" : ""}{result.raceDayProjection.tsb}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Gns. ugentlig TSS</p>
              <p className="text-lg font-bold text-foreground">{result.avgWeeklyTSS}</p>
            </div>
          </div>

          {/* Projection chart */}
          {result.projection.length > 0 && (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.projection} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={formatDate} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={35} />
                  <Tooltip cursor={false}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    labelFormatter={formatDate}
                  />
                  <Line dataKey="ctl" stroke="#22C55E" strokeWidth={2} dot={false} name="CTL" />
                  <Line dataKey="atl" stroke="#EF4444" strokeWidth={1.5} dot={false} name="ATL" />
                  <Line dataKey="tsb" stroke="#3B82F6" strokeWidth={2} dot={false} name="TSB" />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <ReferenceLine x={result.raceDate.split("T")[0]} stroke="#EAB308" strokeWidth={2} label={{ value: "Race", fill: "#EAB308", fontSize: 10 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Week summary */}
          <div className="grid gap-2 md:grid-cols-3">
            {result.weeks.map((week) => (
              <div key={week.weekNumber} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground">Uge {week.weekNumber}</span>
                  <span className="text-xs text-amber-400">-{100 - week.reductionPct}%</span>
                </div>
                <p className="text-sm font-bold text-foreground">{week.weeklyTss} TSS</p>
                <p className="text-[10px] text-muted-foreground">
                  {week.dailyTargets.filter((d) => !d.isRestDay).length} traeningsdage, {week.dailyTargets.filter((d) => d.isRestDay).length} hviledage
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
