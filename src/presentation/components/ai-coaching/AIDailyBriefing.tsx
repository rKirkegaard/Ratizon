import { useDailyBriefing, useGenerateBriefing } from '@/application/hooks/ai-coaching/useAICoaching';
import { useAthleteStore } from '@/application/stores/athleteStore';
import { Bot, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export function AIDailyBriefing() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: briefing, isLoading } = useDailyBriefing(athleteId);
  const generateMutation = useGenerateBriefing(athleteId);

  if (isLoading) {
    return (
      <div data-testid="ai-daily-briefing" className="bg-card border border-border/50 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    );
  }

  if (!briefing) {
    return (
      <div data-testid="ai-daily-briefing" className="bg-card border border-border/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bot className="h-5 w-5" />
            <span className="text-sm">AI Coach Briefing</span>
          </div>
          <button
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

  const statusConfig = {
    green: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    amber: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    red: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  };
  const status = statusConfig[(briefing as any).status as keyof typeof statusConfig] || statusConfig.green;
  const StatusIcon = status.icon;

  return (
    <div data-testid="ai-daily-briefing" className={`border rounded-lg p-4 ${status.bg} ${status.border}`}>
      <div className="flex items-start gap-3">
        <StatusIcon className={`h-5 w-5 mt-0.5 ${status.color}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">AI Coach</span>
            <span className="text-[10px] text-muted-foreground">{(briefing as any).generatedAt ? 'I dag' : ''}</span>
          </div>
          <p className="text-sm text-foreground">{(briefing as any).recommendation || (briefing as any).content || 'Ingen briefing tilgængelig'}</p>
          {(briefing as any).reasoning && (
            <p className="text-xs text-muted-foreground mt-1">{(briefing as any).reasoning}</p>
          )}
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
