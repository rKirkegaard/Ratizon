import { BarChart3, DollarSign, Zap, TrendingUp } from "lucide-react";
import { useLLMUsage } from "@/application/hooks/llm/useLLMSettings";

interface LLMUsagePanelProps {
  athleteId: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  mistral: "Mistral",
  local: "Lokal",
};

export default function LLMUsagePanel({ athleteId }: LLMUsagePanelProps) {
  const { data: rawData, isLoading } = useLLMUsage(athleteId);
  const stats = (rawData as any)?.data ?? rawData;

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-lg border border-border bg-card" />;
  }

  if (!stats) {
    return (
      <div data-testid="llm-usage-panel" className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          <h2 className="text-base font-semibold text-foreground">AI Forbrug</h2>
        </div>
        <p className="text-sm text-muted-foreground">Ingen forbrugsdata endnu.</p>
      </div>
    );
  }

  const { currentMonth, limit, byProvider } = stats;
  const costUsd = (currentMonth.totalCostCents / 100).toFixed(2);
  const limitUsd = limit.limitCents ? (limit.limitCents / 100).toFixed(2) : null;
  const pct = Math.min(limit.usagePct, 100);

  return (
    <div data-testid="llm-usage-panel" className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-blue-400" />
        <h2 className="text-base font-semibold text-foreground">AI Forbrug — Denne Maaned</h2>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
          <DollarSign className="mx-auto h-4 w-4 text-emerald-400 mb-1" />
          <div className="text-lg font-bold text-foreground">${costUsd}</div>
          <div className="text-[10px] text-muted-foreground">Omkostning</div>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
          <Zap className="mx-auto h-4 w-4 text-amber-400 mb-1" />
          <div className="text-lg font-bold text-foreground">{currentMonth.totalTokens.toLocaleString("da-DK")}</div>
          <div className="text-[10px] text-muted-foreground">Tokens</div>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
          <TrendingUp className="mx-auto h-4 w-4 text-purple-400 mb-1" />
          <div className="text-lg font-bold text-foreground">{currentMonth.requestCount}</div>
          <div className="text-[10px] text-muted-foreground">Forespoegsler</div>
        </div>
      </div>

      {/* Budget bar */}
      {limitUsd && (
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Budget: ${costUsd} / ${limitUsd}</span>
            <span className={pct > 80 ? "text-red-400" : pct > 50 ? "text-amber-400" : "text-emerald-400"}>
              {Math.round(pct)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* By provider */}
      {byProvider && byProvider.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Fordelt pr. provider</p>
          <div className="space-y-1">
            {byProvider.map((p: any) => (
              <div key={p.provider} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{PROVIDER_LABELS[p.provider] ?? p.provider}</span>
                <div className="flex gap-3 text-muted-foreground">
                  <span>${(p.costCents / 100).toFixed(2)}</span>
                  <span>{p.requests} req</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
