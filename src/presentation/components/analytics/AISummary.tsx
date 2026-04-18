import { Bot, RefreshCw, CheckCircle2, AlertTriangle, Target } from "lucide-react";
import { useWeeklySummary, useGenerateWeeklySummary } from "@/application/hooks/ai-coaching/useAICoaching";
import { useAthleteStore } from "@/application/stores/athleteStore";

interface AISummaryProps {
  weekDate: string; // yyyy-MM-dd
}

interface SummaryData {
  id: string;
  summary: string;
  highlights: string[] | null;
  concerns: string[] | null;
  nextWeekFocus: string[] | null;
  generatedAt: string;
}

export default function AISummary({ weekDate }: AISummaryProps) {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: rawSummary, isLoading } = useWeeklySummary(athleteId, weekDate);
  const generateMutation = useGenerateWeeklySummary(athleteId);

  const summary = rawSummary as SummaryData | null | undefined;

  if (isLoading) {
    return (
      <div data-testid="ai-weekly-summary" className="rounded-lg border border-border/50 bg-card p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div data-testid="ai-weekly-summary" className="rounded-lg border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bot className="h-5 w-5" />
            <span className="text-sm">AI Ugeopsamling</span>
          </div>
          <button
            data-testid="generate-weekly-summary"
            onClick={() => generateMutation.mutate(weekDate)}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {generateMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
            Generer opsummering
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="ai-weekly-summary" className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">AI Ugeopsamling</span>
        </div>
        <button
          onClick={() => generateMutation.mutate(weekDate)}
          disabled={generateMutation.isPending}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
        </button>
      </div>

      <p className="text-sm text-foreground whitespace-pre-wrap">{summary.summary}</p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {summary.highlights && summary.highlights.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 mb-1">
              <CheckCircle2 className="h-3 w-3" /> Highlights
            </div>
            <ul className="space-y-0.5">
              {summary.highlights.map((h, i) => <li key={i} className="text-xs text-foreground">{h}</li>)}
            </ul>
          </div>
        )}
        {summary.concerns && summary.concerns.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400 mb-1">
              <AlertTriangle className="h-3 w-3" /> Bekymringer
            </div>
            <ul className="space-y-0.5">
              {summary.concerns.map((c, i) => <li key={i} className="text-xs text-foreground">{c}</li>)}
            </ul>
          </div>
        )}
        {summary.nextWeekFocus && summary.nextWeekFocus.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1">
              <Target className="h-3 w-3" /> Naeste uge
            </div>
            <ul className="space-y-0.5">
              {summary.nextWeekFocus.map((f, i) => <li key={i} className="text-xs text-foreground">{f}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
