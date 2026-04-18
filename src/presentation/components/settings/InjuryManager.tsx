import { useState } from "react";
import { HeartPulse, Plus, Trash2, Brain, Loader2, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";

interface InjuryManagerProps {
  athleteId: string;
}

const PHASES = [
  { value: "acute", label: "Akut" },
  { value: "subacute", label: "Subakut" },
  { value: "return_to_run", label: "Return-to-run" },
  { value: "full_training", label: "Fuld traening" },
];

const SEVERITY = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderat" },
  { value: "severe", label: "Alvorlig" },
];

export default function InjuryManager({ athleteId }: InjuryManagerProps) {
  const queryClient = useQueryClient();
  const { data: rawData, isLoading } = useQuery({
    queryKey: ["injuries", athleteId],
    queryFn: () => apiClient.get(`/ai-coaching/${athleteId}/injuries`),
    enabled: !!athleteId,
  });

  const injuries = ((rawData as any)?.data ?? rawData ?? []) as any[];

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ injuryType: "", bodyLocation: "", severity: "moderate", injuryDate: new Date().toISOString().slice(0, 10), triggerNotes: "" });
  const [protocolId, setProtocolId] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<any>(null);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post(`/ai-coaching/${athleteId}/injuries`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["injuries"] }); setShowCreate(false); setForm({ injuryType: "", bodyLocation: "", severity: "moderate", injuryDate: new Date().toISOString().slice(0, 10), triggerNotes: "" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/ai-coaching/${athleteId}/injuries/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["injuries"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiClient.put(`/ai-coaching/${athleteId}/injuries/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["injuries"] }),
  });

  const protocolMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/ai-coaching/${athleteId}/injuries/${id}/return-protocol`),
    onSuccess: (res: any, id) => { setProtocolId(id); setProtocol(res?.data ?? res); queryClient.invalidateQueries({ queryKey: ["injuries"] }); },
  });

  if (isLoading) return <div className="h-32 animate-pulse rounded-lg border border-border bg-card" />;

  return (
    <div data-testid="injury-manager" className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-red-400" />
          <h2 className="text-base font-semibold text-foreground">Skader & Genoptraening</h2>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Plus size={14} /> Registrer skade
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Skadestype</label>
              <input value={form.injuryType} onChange={(e) => setForm({ ...form, injuryType: e.target.value })} placeholder="F.eks. Laegskade" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Lokation</label>
              <input value={form.bodyLocation} onChange={(e) => setForm({ ...form, bodyLocation: e.target.value })} placeholder="F.eks. Hoejre laeg" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Alvorlighed</label>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                {SEVERITY.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Dato</label>
              <input type="date" value={form.injuryDate} onChange={(e) => setForm({ ...form, injuryDate: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Trigger/noter</label>
            <input value={form.triggerNotes} onChange={(e) => setForm({ ...form, triggerNotes: e.target.value })} placeholder="F.eks. Skete efter 15km loeb" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <button onClick={() => createMutation.mutate(form)} disabled={!form.injuryType || !form.bodyLocation || createMutation.isPending} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
            {createMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Registrer
          </button>
        </div>
      )}

      {injuries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Ingen skader registreret.</p>
      ) : (
        <div className="space-y-2">
          {injuries.map((inj: any) => (
            <div key={inj.id} className={`rounded-lg border px-4 py-3 space-y-2 ${inj.resolved_date ? "border-border/50 bg-muted/10 opacity-60" : "border-red-500/20 bg-red-500/5"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-foreground">{inj.injury_type}</span>
                  <span className="text-xs text-muted-foreground ml-2">{inj.body_location}</span>
                  <span className={`ml-2 rounded-full border px-2 py-0.5 text-[10px] ${inj.severity === "severe" ? "border-red-500/20 text-red-400" : inj.severity === "moderate" ? "border-amber-500/20 text-amber-400" : "border-blue-500/20 text-blue-400"}`}>
                    {SEVERITY.find((s) => s.value === inj.severity)?.label ?? inj.severity}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={inj.current_phase ?? "acute"}
                    onChange={(e) => updateMutation.mutate({ id: inj.id, currentPhase: e.target.value })}
                    className="rounded border border-border bg-background px-2 py-0.5 text-[10px] text-foreground"
                  >
                    {PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <button onClick={() => protocolMutation.mutate(inj.id)} disabled={protocolMutation.isPending} className="flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-400 hover:bg-purple-500/20 disabled:opacity-50">
                    {protocolMutation.isPending && protocolId === inj.id ? <Loader2 size={10} className="animate-spin" /> : <Brain size={10} />} Protokol
                  </button>
                  <button onClick={() => { if (confirm("Slet skade?")) deleteMutation.mutate(inj.id); }} className="text-xs text-red-400 hover:text-red-300">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Dato: {inj.injury_date} {inj.trigger_notes && `— ${inj.trigger_notes}`}
              </div>
              {inj.return_protocol && (
                <div className="rounded-lg bg-muted/20 p-2 space-y-1">
                  <p className="text-[10px] font-medium text-purple-400">Return-to-training protokol</p>
                  {inj.return_protocol.phases?.map((p: any, i: number) => (
                    <div key={i} className="text-[10px] text-muted-foreground">
                      <span className="text-foreground font-medium">{p.phase}</span> ({p.duration}): {p.activities?.join(", ")}
                    </div>
                  ))}
                  {inj.return_protocol.crossTraining && (
                    <p className="text-[10px] text-muted-foreground">Alternativ traening: {inj.return_protocol.crossTraining.join(", ")}</p>
                  )}
                </div>
              )}
              {protocolId === inj.id && protocol?.protocol?.raw && (
                <pre className="text-[10px] text-foreground whitespace-pre-wrap bg-muted/20 p-2 rounded">{protocol.protocol.raw}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
