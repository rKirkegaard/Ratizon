import { useSessionFeedback, useGenerateSessionFeedback } from "@/application/hooks/ai-coaching/useAICoaching";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { Bot, RefreshCw, CheckCircle2, TrendingUp, ArrowRight } from "lucide-react";

interface FeedbackData {
  id: string;
  overallAssessment: string;
  strengths: string[];
  improvements: string[];
  nextSessionSuggestion: string | null;
  generatedAt: string;
}

interface AISessionFeedbackProps {
  sessionId: number;
}

export function AISessionFeedback({ sessionId }: AISessionFeedbackProps) {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: rawFeedback, isLoading } = useSessionFeedback(athleteId, sessionId);
  const generateMutation = useGenerateSessionFeedback(athleteId);

  const feedback = rawFeedback as FeedbackData | null | undefined;

  if (isLoading) {
    return (
      <div data-testid="ai-session-feedback" className="rounded-lg border border-border/50 bg-card p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
        <div className="h-3 bg-muted rounded w-full mb-1" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    );
  }

  if (!feedback) {
    return (
      <div data-testid="ai-session-feedback" className="rounded-lg border border-border/50 bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bot className="h-4 w-4" />
            <span className="text-sm">AI Session Feedback</span>
          </div>
          <button
            data-testid="generate-session-feedback"
            onClick={() => generateMutation.mutate(sessionId)}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {generateMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
            Analyser session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="ai-session-feedback" className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">AI Session Feedback</span>
        </div>
        <button
          onClick={() => generateMutation.mutate(sessionId)}
          disabled={generateMutation.isPending}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Overall assessment */}
      <p className="text-sm text-foreground whitespace-pre-wrap">{feedback.overallAssessment}</p>

      {/* Strengths + Improvements in two columns */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {feedback.strengths && feedback.strengths.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 mb-1">
              <CheckCircle2 className="h-3 w-3" /> Styrker
            </div>
            <ul className="space-y-0.5">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="text-xs text-foreground">{s}</li>
              ))}
            </ul>
          </div>
        )}
        {feedback.improvements && feedback.improvements.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400 mb-1">
              <TrendingUp className="h-3 w-3" /> Forbedringer
            </div>
            <ul className="space-y-0.5">
              {feedback.improvements.map((im, i) => (
                <li key={i} className="text-xs text-foreground">{im}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Next session suggestion */}
      {feedback.nextSessionSuggestion && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground border-t border-border/50 pt-2">
          <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
          <span>{feedback.nextSessionSuggestion}</span>
        </div>
      )}
    </div>
  );
}
