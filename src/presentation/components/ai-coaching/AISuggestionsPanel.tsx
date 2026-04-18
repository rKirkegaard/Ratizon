import { useState } from "react";
import { Lightbulb, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { useSuggestions, useLogSuggestionFeedback } from "@/application/hooks/ai-coaching/useAICoaching";
import { useAthleteStore } from "@/application/stores/athleteStore";

const TYPE_LABELS: Record<string, string> = {
  training: "Traening",
  recovery: "Restitution",
  nutrition: "Ernaering",
  technique: "Teknik",
  general: "Generelt",
};

export default function AISuggestionsPanel() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: rawData, isLoading } = useSuggestions(athleteId);
  const feedbackMutation = useLogSuggestionFeedback(athleteId);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const suggestions = ((rawData as any)?.data ?? rawData ?? []) as any[];

  function handleAccept(id: string) {
    feedbackMutation.mutate({ suggestionId: id, accepted: true });
  }

  function handleReject(id: string) {
    feedbackMutation.mutate({ suggestionId: id, accepted: false });
  }

  function handleSendFeedback(id: string) {
    const text = feedbackText[id]?.trim();
    if (!text) return;
    feedbackMutation.mutate({ suggestionId: id, feedback: text });
    setFeedbackText((prev) => ({ ...prev, [id]: "" }));
    setExpandedId(null);
  }

  if (!athleteId) return null;

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-lg border border-border bg-card" />;
  }

  const pending = suggestions.filter((s: any) => s.accepted === null);
  const handled = suggestions.filter((s: any) => s.accepted !== null);

  return (
    <div data-testid="ai-suggestions-panel" className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-amber-400" />
        <h2 className="text-base font-semibold text-foreground">AI Forslag</h2>
        {pending.length > 0 && (
          <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">
            {pending.length} afventer
          </span>
        )}
      </div>

      {suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Ingen AI-forslag endnu. Forslag genereres automatisk baseret paa din traening.</p>
      ) : (
        <div className="space-y-2">
          {/* Pending suggestions first */}
          {pending.map((s: any) => (
            <div
              key={s.id}
              data-testid={`suggestion-${s.id}`}
              className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-medium text-amber-400 uppercase">
                    {TYPE_LABELS[s.suggestionType] ?? s.suggestionType}
                  </span>
                  <p className="text-sm text-foreground mt-0.5">{s.suggestion}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(s.createdAt).toLocaleDateString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  data-testid={`accept-${s.id}`}
                  onClick={() => handleAccept(s.id)}
                  disabled={feedbackMutation.isPending}
                  className="flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  <ThumbsUp size={12} /> Accepter
                </button>
                <button
                  data-testid={`reject-${s.id}`}
                  onClick={() => handleReject(s.id)}
                  disabled={feedbackMutation.isPending}
                  className="flex items-center gap-1 rounded-md bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                >
                  <ThumbsDown size={12} /> Afvis
                </button>
                <button
                  onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <MessageSquare size={12} /> Feedback
                </button>
              </div>
              {expandedId === s.id && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={feedbackText[s.id] ?? ""}
                    onChange={(e) => setFeedbackText((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    placeholder="Skriv feedback..."
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                    onKeyDown={(e) => e.key === "Enter" && handleSendFeedback(s.id)}
                  />
                  <button
                    onClick={() => handleSendFeedback(s.id)}
                    disabled={!feedbackText[s.id]?.trim()}
                    className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Handled suggestions */}
          {handled.slice(0, 5).map((s: any) => (
            <div
              key={s.id}
              className={`rounded-lg border px-3 py-2 ${
                s.accepted ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-muted/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium ${s.accepted ? "text-emerald-400" : "text-muted-foreground"}`}>
                  {s.accepted ? "Accepteret" : "Afvist"} — {TYPE_LABELS[s.suggestionType] ?? s.suggestionType}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.suggestion}</p>
              {s.feedback && (
                <p className="text-[10px] text-muted-foreground mt-1 italic">Feedback: {s.feedback}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
