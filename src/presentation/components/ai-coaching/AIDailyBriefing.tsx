import { useDailyBriefing, useGenerateBriefing } from "@/application/hooks/ai-coaching/useAICoaching";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { Bot, RefreshCw, CheckCircle2, AlertTriangle, Lightbulb, Target } from "lucide-react";

interface BriefingData {
  id: string;
  summary: string;
  recommendations: string[];
  warnings: string[];
  focusAreas: string[];
  generatedAt: string;
}

export function AIDailyBriefing() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: rawBriefing, isLoading } = useDailyBriefing(athleteId);
  const generateMutation = useGenerateBriefing(athleteId);

  const briefing = rawBriefing as BriefingData | null | undefined;

  if (isLoading) {
    return (
      <div data-testid="ai-daily-briefing" className="rounded-lg border border-border/50 bg-card p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    );
  }

  if (!briefing) {
    return (
      <div data-testid="ai-daily-briefing" className="rounded-lg border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bot className="h-5 w-5" />
            <span className="text-sm">AI Coach Briefing</span>
          </div>
          <button
            data-testid="generate-briefing"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {generateMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
            Generer briefing
          </button>
        </div>
      </div>
    );
  }

  const hasWarnings = briefing.warnings && briefing.warnings.length > 0;
  const statusColor = hasWarnings ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5";
  const StatusIcon = hasWarnings ? AlertTriangle : CheckCircle2;
  const statusIconColor = hasWarnings ? "text-amber-400" : "text-emerald-400";

  return (
    <div data-testid="ai-daily-briefing" className={`rounded-lg border p-4 ${statusColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-5 w-5 ${statusIconColor}`} />
          <span className="text-sm font-medium text-foreground">AI Coach Briefing</span>
        </div>
        <button
          data-testid="refresh-briefing"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Summary */}
      <p className="text-sm text-foreground whitespace-pre-wrap mb-3">{briefing.summary}</p>

      {/* Warnings */}
      {hasWarnings && (
        <div className="space-y-1 mb-3">
          {briefing.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-400">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations + Focus areas in two columns */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {briefing.recommendations && briefing.recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
              <Lightbulb className="h-3 w-3" /> Anbefalinger
            </div>
            <ul className="space-y-0.5">
              {briefing.recommendations.map((r, i) => (
                <li key={i} className="text-xs text-foreground">{r}</li>
              ))}
            </ul>
          </div>
        )}
        {briefing.focusAreas && briefing.focusAreas.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
              <Target className="h-3 w-3" /> Fokusomraader
            </div>
            <ul className="space-y-0.5">
              {briefing.focusAreas.map((f, i) => (
                <li key={i} className="text-xs text-foreground">{f}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
