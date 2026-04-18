import { useState } from "react";
import { Inbox, Check, X, CheckCheck, Calendar, Loader2 } from "lucide-react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import {
  useRecommendations,
  useAcceptRecommendation,
  useRejectRecommendation,
  useImplementRecommendation,
} from "@/application/hooks/useRecommendations";

const PRIORITY_STYLE: Record<string, string> = {
  critical: "border-red-500/30 bg-red-500/5",
  high: "border-amber-500/30 bg-amber-500/5",
  medium: "border-border bg-card",
  low: "border-border/50 bg-muted/10",
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  low: "bg-muted text-muted-foreground border-border",
};

const CATEGORY_LABEL: Record<string, string> = {
  training: "Traening",
  recovery: "Restitution",
  nutrition: "Ernaering",
  equipment: "Udstyr",
  overtraining: "Overtraening",
  injury_risk: "Skadesrisiko",
  undertraining: "Undertraening",
  hrv_drop: "HRV-fald",
  sleep_deprivation: "Soevnmangel",
};

const STATUS_FILTER = [
  { value: "pending", label: "Afventende" },
  { value: "accepted", label: "Accepterede" },
  { value: "implemented", label: "Implementerede" },
  { value: "rejected", label: "Afviste" },
  { value: "all", label: "Alle" },
];

export default function RecommendationsInbox() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: rawData, isLoading } = useRecommendations(athleteId, statusFilter);
  const acceptMutation = useAcceptRecommendation();
  const rejectMutation = useRejectRecommendation();
  const implementMutation = useImplementRecommendation();

  const items = ((rawData as any)?.data ?? rawData ?? []) as any[];

  function handleReject(id: string) {
    rejectMutation.mutate({ id, reason: rejectReason || undefined }, {
      onSuccess: () => { setRejectId(null); setRejectReason(""); },
    });
  }

  if (!athleteId) return null;

  return (
    <div data-testid="recommendations-inbox" className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Anbefalinger</h2>
          {items.length > 0 && (
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] text-primary">
              {items.length}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {STATUS_FILTER.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-md px-2 py-1 text-[10px] transition-colors ${
                statusFilter === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-20 animate-pulse rounded-lg bg-muted/20" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Ingen anbefalinger med status "{STATUS_FILTER.find((f) => f.value === statusFilter)?.label}".</p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {items.map((item: any) => (
            <div
              key={item.id}
              data-testid={`rec-${item.id}`}
              className={`rounded-lg border p-3 space-y-2 ${PRIORITY_STYLE[item.priority] ?? PRIORITY_STYLE.medium}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.medium}`}>
                      {item.priority === "critical" ? "Kritisk" : item.priority === "high" ? "Hoej" : item.priority === "medium" ? "Medium" : "Lav"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {CATEGORY_LABEL[item.category] ?? item.category}
                    </span>
                    {item.source && item.source !== "recommendation" && (
                      <span className="text-[10px] text-muted-foreground/50">via {item.source}</span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-foreground mt-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  {item.reasoning && (
                    <p className="text-[10px] text-muted-foreground/70 mt-1 italic">Begrundelse: {item.reasoning}</p>
                  )}
                  {item.sport && (
                    <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                      {item.sport && <span>{item.sport}</span>}
                      {item.scheduledDate && <span>{item.scheduledDate}</span>}
                      {item.durationMinutes && <span>{item.durationMinutes} min</span>}
                      {item.tss && <span>TSS {item.tss}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions for pending items */}
              {item.status === "pending" && !item.source?.startsWith("alert") && !item.source?.startsWith("briefing") && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => acceptMutation.mutate(item.id)}
                    disabled={acceptMutation.isPending}
                    className="flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    {acceptMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : <Check size={12} />}
                    Accepter
                    {item.sport && <Calendar size={10} className="ml-0.5" />}
                  </button>
                  <button
                    onClick={() => setRejectId(rejectId === item.id ? null : item.id)}
                    className="flex items-center gap-1 rounded-md bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/20"
                  >
                    <X size={12} /> Afvis
                  </button>
                </div>
              )}

              {/* Reject reason input */}
              {rejectId === item.id && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Valgfri begrundelse..."
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                  />
                  <button onClick={() => handleReject(item.id)} className="rounded-md bg-red-500 px-2 py-1 text-xs text-white">Afvis</button>
                </div>
              )}

              {/* Actions for accepted items */}
              {item.status === "accepted" && (
                <button
                  onClick={() => implementMutation.mutate({ id: item.id })}
                  disabled={implementMutation.isPending}
                  className="flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  <CheckCheck size={12} /> Marker som implementeret
                </button>
              )}

              {/* Status badges for non-pending */}
              {item.status === "rejected" && item.rejectionReason && (
                <p className="text-[10px] text-red-400/70 italic">Afvist: {item.rejectionReason}</p>
              )}
              {item.status === "implemented" && item.implementationNotes && (
                <p className="text-[10px] text-emerald-400/70 italic">Noter: {item.implementationNotes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
