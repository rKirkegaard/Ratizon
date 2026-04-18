import { useState } from "react";
import { CalendarDays, RefreshCw, Loader2, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { useMonthlySummary, useGenerateMonthlySummary } from "@/application/hooks/ai-coaching/useAICoaching";
import { useAthleteStore } from "@/application/stores/athleteStore";

export default function AIMonthlySummary() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: rawData, isLoading } = useMonthlySummary(athleteId, year, month);
  const generateMutation = useGenerateMonthlySummary(athleteId);

  const summary = (rawData as any)?.data ?? rawData;
  const highlights = Array.isArray(summary?.highlights) ? summary.highlights : [];
  const concerns = Array.isArray(summary?.concerns) ? summary.concerns : [];
  const nextFocus = Array.isArray(summary?.nextMonthFocus) ? summary.nextMonthFocus : [];

  const MONTHS = [
    "Januar", "Februar", "Marts", "April", "Maj", "Juni",
    "Juli", "August", "September", "Oktober", "November", "December"
  ];

  function handleGenerate() {
    generateMutation.mutate({ year, month });
  }

  if (!athleteId) return null;

  return (
    <div data-testid="ai-monthly-summary" className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-foreground">Maanedlig AI-rapport</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            data-testid="generate-monthly-summary"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {generateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Generer
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted/20" />
      ) : !summary?.summary ? (
        <div className="rounded-lg bg-muted/20 p-4 text-center">
          <p className="text-sm text-muted-foreground">Ingen maanedlig rapport for {MONTHS[month - 1]} {year}.</p>
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Generer rapport
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{summary.summary}</p>

          {highlights.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp size={14} className="text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Hoejdepunkter</span>
              </div>
              <ul className="space-y-1">
                {highlights.map((h: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-emerald-400 shrink-0">+</span> {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {concerns.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle size={14} className="text-amber-400" />
                <span className="text-xs font-medium text-amber-400">Bekymringer</span>
              </div>
              <ul className="space-y-1">
                {concerns.map((c: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-amber-400 shrink-0">!</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {nextFocus.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target size={14} className="text-blue-400" />
                <span className="text-xs font-medium text-blue-400">Fokus naeste maaned</span>
              </div>
              <ul className="space-y-1">
                {nextFocus.map((f: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-blue-400 shrink-0">→</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.generatedAt && (
            <p className="text-[10px] text-muted-foreground">
              Genereret {new Date(summary.generatedAt).toLocaleDateString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
