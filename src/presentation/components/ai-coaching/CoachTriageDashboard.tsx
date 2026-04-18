import { useState } from "react";
import { Users, AlertCircle, AlertTriangle, Activity, Clock, Send, Loader2, MessageSquare } from "lucide-react";
import { useCoachTriage, useDraftMessage, type TriageCard } from "@/application/hooks/useCoachTriage";

const PRIORITY_CONFIG = {
  critical: { border: "border-red-500/30", bg: "bg-red-500/5", badge: "bg-red-500/10 text-red-400 border-red-500/20" },
  warning: { border: "border-amber-500/30", bg: "bg-amber-500/5", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  ok: { border: "border-border", bg: "bg-card", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
};

const PRIORITY_LABELS = { critical: "Kritisk", warning: "Advarsel", ok: "OK" };

const MESSAGE_TYPES = [
  { value: "weekly_checkin", label: "Ugentlig check-in" },
  { value: "pre_race", label: "Pre-race motivation" },
  { value: "post_session", label: "Post-session feedback" },
  { value: "compliance_nudge", label: "Compliance paamindelse" },
  { value: "milestone", label: "Milepael lykoenkning" },
];

export default function CoachTriageDashboard() {
  const { data: rawData, isLoading } = useCoachTriage();
  const draftMutation = useDraftMessage();
  const [draftTarget, setDraftTarget] = useState<string | null>(null);
  const [messageType, setMessageType] = useState("weekly_checkin");
  const [draftResult, setDraftResult] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "critical" | "warning">("all");

  const cards = ((rawData as any)?.data ?? rawData ?? []) as TriageCard[];
  const filtered = filter === "all" ? cards : cards.filter((c) => c.priority === filter);

  const critCount = cards.filter((c) => c.priority === "critical").length;
  const warnCount = cards.filter((c) => c.priority === "warning").length;

  function handleDraft(athleteId: string) {
    setDraftTarget(athleteId);
    setDraftResult(null);
    draftMutation.mutate(
      { athleteId, messageType },
      {
        onSuccess: (res: any) => {
          const data = res?.data ?? res;
          setDraftResult(data?.draft ?? "Ingen besked genereret.");
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div data-testid="coach-triage" className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-lg border border-border bg-card" />)}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="coach-triage" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Atlet-overblik</h2>
          <span className="text-sm text-muted-foreground">({cards.length} atleter)</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-md px-2.5 py-1 text-xs ${filter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Alle ({cards.length})
          </button>
          {critCount > 0 && (
            <button
              onClick={() => setFilter("critical")}
              className={`rounded-md px-2.5 py-1 text-xs ${filter === "critical" ? "bg-red-500 text-white" : "text-red-400 hover:bg-red-500/10"}`}
            >
              Kritisk ({critCount})
            </button>
          )}
          {warnCount > 0 && (
            <button
              onClick={() => setFilter("warning")}
              className={`rounded-md px-2.5 py-1 text-xs ${filter === "warning" ? "bg-amber-500 text-white" : "text-amber-400 hover:bg-amber-500/10"}`}
            >
              Advarsel ({warnCount})
            </button>
          )}
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Ingen atleter tildelt endnu.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((card) => {
            const config = PRIORITY_CONFIG[card.priority];
            return (
              <div
                key={card.athleteId}
                data-testid={`triage-card-${card.athleteId}`}
                className={`rounded-lg border ${config.border} ${config.bg} p-4 space-y-3`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{card.name}</h3>
                    {card.sport && <span className="text-[10px] text-muted-foreground uppercase">{card.sport}</span>}
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.badge}`}>
                    {PRIORITY_LABELS[card.priority]}
                  </span>
                </div>

                {/* PMC stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-xs font-bold text-foreground">{card.ctl ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground">CTL</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-foreground">{card.atl ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground">ATL</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xs font-bold ${
                      card.tsb != null && card.tsb <= -20 ? "text-red-400" :
                      card.tsb != null && card.tsb < 0 ? "text-amber-400" : "text-emerald-400"
                    }`}>{card.tsb ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground">TSB</div>
                  </div>
                </div>

                {/* Alerts */}
                {card.activeAlerts > 0 && (
                  <div className="flex items-center gap-1.5">
                    {card.criticalAlerts > 0 ? (
                      <AlertCircle size={12} className="text-red-400" />
                    ) : (
                      <AlertTriangle size={12} className="text-amber-400" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {card.activeAlerts} aktiv{card.activeAlerts > 1 ? "e" : ""} alert{card.activeAlerts > 1 ? "s" : ""}
                      {card.criticalAlerts > 0 && <span className="text-red-400 ml-1">({card.criticalAlerts} kritisk{card.criticalAlerts > 1 ? "e" : ""})</span>}
                    </span>
                  </div>
                )}

                {/* Last session */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {card.lastSession ? (
                    <>
                      <Activity size={12} />
                      <span>Sidst: {card.lastSession.title}</span>
                      <span className="ml-auto">{card.daysSinceLastSession === 0 ? "I dag" : `${card.daysSinceLastSession}d siden`}</span>
                    </>
                  ) : (
                    <>
                      <Clock size={12} />
                      <span>Ingen sessioner registreret</span>
                    </>
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground">
                  {card.sessionsLast7Days} sessioner sidste 7 dage
                </div>

                {/* Draft message button */}
                <button
                  data-testid={`draft-msg-${card.athleteId}`}
                  onClick={() => handleDraft(card.athleteId)}
                  disabled={draftMutation.isPending && draftTarget === card.athleteId}
                  className="flex items-center gap-1 w-full justify-center rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
                >
                  {draftMutation.isPending && draftTarget === card.athleteId ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <MessageSquare size={12} />
                  )}
                  Generer besked
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Draft message modal */}
      {draftTarget && draftResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => { setDraftTarget(null); setDraftResult(null); }}>
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">AI Besked-udkast</h3>
            </div>
            <div className="flex gap-2">
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                {MESSAGE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button
                onClick={() => handleDraft(draftTarget)}
                disabled={draftMutation.isPending}
                className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {draftMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : null}
                Generer igen
              </button>
            </div>
            <div className="rounded-lg bg-muted/20 p-3">
              <p className="text-sm text-foreground whitespace-pre-line">{draftResult}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(draftResult); }}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Kopier
              </button>
              <button
                onClick={() => { setDraftTarget(null); setDraftResult(null); }}
                className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
              >
                Luk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
