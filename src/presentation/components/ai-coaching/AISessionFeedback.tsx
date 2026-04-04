import { useSessionFeedback, useGenerateSessionFeedback } from '@/application/hooks/ai-coaching/useAICoaching';
import { useAthleteStore } from '@/application/stores/athleteStore';
import { Bot, RefreshCw, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';

interface AISessionFeedbackProps {
  sessionId: number;
}

export function AISessionFeedback({ sessionId }: AISessionFeedbackProps) {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: feedback, isLoading } = useSessionFeedback(athleteId, sessionId);
  const generateMutation = useGenerateSessionFeedback(athleteId);

  if (isLoading) {
    return (
      <div data-testid="ai-session-feedback" className="bg-card border border-border/50 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
        <div className="h-3 bg-muted rounded w-full mb-1" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    );
  }

  if (!feedback) {
    return (
      <div data-testid="ai-session-feedback" className="bg-card border border-border/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bot className="h-4 w-4" />
            <span className="text-sm">AI Session Feedback</span>
          </div>
          <button
            onClick={() => generateMutation.mutate(sessionId)}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {generateMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
            Analysér session
          </button>
        </div>
      </div>
    );
  }

  const fb = feedback as any;
  const qualityIcon = fb.qualityScore >= 80 ? ThumbsUp : fb.qualityScore >= 60 ? Minus : ThumbsDown;
  const qualityColor = fb.qualityScore >= 80 ? 'text-green-400' : fb.qualityScore >= 60 ? 'text-amber-400' : 'text-red-400';
  const QualityIcon = qualityIcon;

  return (
    <div data-testid="ai-session-feedback" className="bg-card border border-border/50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Bot className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">AI Feedback</span>
            {fb.qualityScore != null && (
              <span className={`flex items-center gap-1 text-xs ${qualityColor}`}>
                <QualityIcon className="h-3 w-3" />
                {fb.qualityScore}/100
              </span>
            )}
          </div>
          {fb.summary && <p className="text-sm text-foreground mb-2">{fb.summary}</p>}
          {fb.observations && fb.observations.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1">
              {fb.observations.map((obs: string, i: number) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">•</span>
                  {obs}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
