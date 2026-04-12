import { useState, useMemo, useRef } from "react";
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import DatePicker from "@/presentation/components/shared/DatePicker";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";

interface EditSession {
  id: string;
  sport: string;
  scheduledDate: string;
  sessionPurpose: string;
  title: string;
  description?: string | null;
  targetDurationSeconds?: number | null;
  targetTss?: number | null;
  sessionBlocks?: SessionBlock[] | null;
}

interface CreateSessionDialogProps {
  open: boolean;
  onClose: () => void;
  editSession?: EditSession | null;
}

const SPORT_OPTIONS = [
  { value: "swim", label: "Svoem" },
  { value: "bike", label: "Cykel" },
  { value: "run", label: "Loeb" },
];

const TYPE_OPTIONS = [
  { value: "recovery", label: "Restitution" },
  { value: "endurance", label: "Udholdenhed" },
  { value: "tempo", label: "Tempo" },
  { value: "sweet_spot", label: "Sweet Spot" },
  { value: "threshold", label: "Threshold" },
  { value: "vo2max", label: "VO2Max" },
  { value: "anaerobic", label: "Anaerobic" },
];

const BLOCK_TYPES = [
  { value: "warmup", label: "Opvarmning" },
  { value: "main", label: "Hoveddel" },
  { value: "interval", label: "Interval" },
  { value: "recovery", label: "Recovery" },
  { value: "cooldown", label: "Nedkoeling" },
];

interface SessionBlock {
  id: string;
  type: string;
  durationSeconds: number;
  repeatCount: number;
  targetHrZone: number;
  targetPace: string;  // M:SS format, e.g. "4:30"
  restPace: string;    // M:SS format for rest pace, e.g. "6:30"
  restSeconds: number;
  description: string;
}

import { calcBlocksTss, calcBlocksDuration } from "@/domain/utils/tssCalculator";
import { useAthleteProfile } from "@/application/hooks/athlete/useAthleteProfile";

export default function CreateSessionDialog({ open, onClose, editSession }: CreateSessionDialogProps) {
  const queryClient = useQueryClient();
  const selectedAthleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: profileData } = useAthleteProfile(selectedAthleteId);
  const athleteThresholdPace = (profileData?.data ?? (profileData as any))?.runThresholdPace ?? null;
  const isEdit = !!editSession;
  const [mode, setMode] = useState<"simple" | "structured">("simple");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sport, setSport] = useState("bike");
  const [trainingType, setTrainingType] = useState("endurance");
  const [duration, setDuration] = useState("60");
  const [tss, setTss] = useState("50");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Structured mode blocks
  const [blocks, setBlocks] = useState<SessionBlock[]>([]);

  // Populate form from editSession when opening in edit mode
  const loadedEditId = useRef<string | null>(null);
  useMemo(() => {
    if (!open || !editSession) { loadedEditId.current = null; return; }
    if (loadedEditId.current === editSession.id) return;
    loadedEditId.current = editSession.id;
    setTimeout(() => {
      setTitle(editSession.title);
      setDate(editSession.scheduledDate.split("T")[0]);
      setSport(editSession.sport);
      setTrainingType(editSession.sessionPurpose);
      if (editSession.sessionBlocks && editSession.sessionBlocks.length > 0) {
        setMode("structured");
        setBlocks([...editSession.sessionBlocks]);
      } else {
        setMode("simple");
        setBlocks([]);
        setDuration(editSession.targetDurationSeconds ? String(Math.round(editSession.targetDurationSeconds / 60)) : "60");
        setTss(editSession.targetTss ? String(Math.round(editSession.targetTss)) : "50");
      }
    }, 0);
  }, [open, editSession]);

  const addBlock = () => {
    setBlocks((prev) => [...prev, {
      id: crypto.randomUUID(),
      type: "main",
      durationSeconds: 600,
      repeatCount: 1,
      targetHrZone: 2,
      targetPace: "",
      restPace: "",
      restSeconds: 0,
      description: "",
    }]);
  };

  const updateBlock = (id: string, updates: Partial<SessionBlock>) => {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, ...updates } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    setBlocks((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  // Auto-calc from blocks
  const calcDuration = useMemo(() => {
    if (mode !== "structured" || blocks.length === 0) return null;
    return Math.round(calcBlocksDuration(blocks) / 60);
  }, [blocks, mode]);

  const calcTss = useMemo(() => {
    if (mode !== "structured" || blocks.length === 0) return null;
    return Math.round(calcBlocksTss(blocks, sport, athleteThresholdPace));
  }, [blocks, mode, sport, athleteThresholdPace]);

  const effectiveDuration = mode === "structured" && calcDuration ? calcDuration : Number(duration) || 60;
  const effectiveTss = mode === "structured" && calcTss ? calcTss : Number(tss) || 0;

  if (!open) return null;

  const handleSave = async () => {
    if (!selectedAthleteId) { setError("Vaelg en atlet foerst"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        sport,
        scheduled_date: date,
        session_purpose: trainingType,
        title: title || TYPE_OPTIONS.find((t) => t.value === trainingType)?.label || sport,
        target_duration_seconds: effectiveDuration * 60,
        target_tss: mode === "structured" ? null : effectiveTss,
        session_blocks: mode === "structured" ? blocks : null,
      };
      if (isEdit && editSession) {
        await apiClient.put(`/planning/${selectedAthleteId}/sessions/${editSession.id}`, payload);
      } else {
        await apiClient.post(`/planning/${selectedAthleteId}/sessions`, payload);
      }
      queryClient.invalidateQueries({ queryKey: ["calendar-planned"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-sessions"] });
      onClose();
      setTitle(""); setDuration("60"); setTss("50"); setBlocks([]); setMode("simple");
    } catch (err: any) {
      const msg = err?.data?.error;
      setError(typeof msg === "string" ? msg : msg?.message ?? "Kunne ikke oprette pas");
    }
    setSaving(false);
  };

  return (
    <div data-testid="create-session-dialog" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-foreground">{isEdit ? "Rediger pas" : "Opret nyt pas"}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{isEdit ? "Opdater det planlagte traeningspas" : "Tilfoej et planlagt pas til kalenderen"}</p>

        {error && <div className="mb-3 rounded-md bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400">{typeof error === "string" ? error : JSON.stringify(error)}</div>}

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode("simple")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === "simple" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}>
            Simpel
          </button>
          <button onClick={() => setMode("structured")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === "structured" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}>
            Struktureret
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Titel</label>
            <input data-testid="session-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Valgfrit — auto fra type" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Dato</label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Sport</label>
              <select data-testid="session-sport" value={sport} onChange={(e) => setSport(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                {SPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Traeningstype</label>
            <select data-testid="session-type" value={trainingType} onChange={(e) => setTrainingType(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Simple mode: manual duration + TSS */}
          {mode === "simple" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Varighed (min)</label>
                <input data-testid="session-duration" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="1" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">TSS</label>
                <input data-testid="session-tss" type="number" value={tss} onChange={(e) => setTss(e.target.value)} min="0" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
              </div>
            </div>
          )}

          {/* Structured mode: session blocks */}
          {mode === "structured" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Sessionsblokke</span>
                <button onClick={addBlock} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                  <Plus size={12} /> Tilfoej blok
                </button>
              </div>

              {blocks.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">Tilfoej blokke for at bygge traeningspas</p>
              )}

              {blocks.map((block, idx) => (
                <div key={block.id} className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">Blok {idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronUp size={12} /></button>
                      <button onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronDown size={12} /></button>
                      <button onClick={() => removeBlock(block.id)} className="rounded p-0.5 text-muted-foreground hover:text-red-400"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div className={`grid gap-2 ${sport === "run" ? "grid-cols-4" : "grid-cols-3"}`}>
                    <div>
                      <label className="block text-[10px] text-muted-foreground">Type</label>
                      <select value={block.type} onChange={(e) => updateBlock(block.id, { type: e.target.value })} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground">
                        {BLOCK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground">Varighed (m:ss)</label>
                      <input type="text" value={`${Math.floor(block.durationSeconds / 60)}:${String(block.durationSeconds % 60).padStart(2, "0")}`} onChange={(e) => {
                        const match = e.target.value.match(/^(\d+):?(\d{0,2})$/);
                        if (match) {
                          const mins = parseInt(match[1]) || 0;
                          const secs = parseInt(match[2]) || 0;
                          updateBlock(block.id, { durationSeconds: mins * 60 + secs });
                        } else if (e.target.value === "") {
                          updateBlock(block.id, { durationSeconds: 0 });
                        }
                      }} placeholder="10:00" className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground">HR Zone</label>
                      <select value={block.targetHrZone} onChange={(e) => updateBlock(block.id, { targetHrZone: Number(e.target.value) })} className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground">
                        {[1,2,3,4,5].map((z) => <option key={z} value={z}>Z{z}</option>)}
                      </select>
                    </div>
                    {sport === "run" && (
                      <div>
                        <label className="block text-[10px] text-muted-foreground">Pace (min/km)</label>
                        <input type="text" value={block.targetPace ?? ""} onChange={(e) => updateBlock(block.id, { targetPace: e.target.value })} placeholder="5:00" className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground" />
                      </div>
                    )}
                  </div>
                  {block.type === "interval" && (
                    <div className={`grid gap-2 ${sport === "run" ? "grid-cols-3" : "grid-cols-2"}`}>
                      <div>
                        <label className="block text-[10px] text-muted-foreground">Gentagelser</label>
                        <input type="number" value={block.repeatCount} onChange={(e) => updateBlock(block.id, { repeatCount: Number(e.target.value) || 1 })} min="1" className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground">Hvile (m:ss)</label>
                        <input type="text" value={`${Math.floor(block.restSeconds / 60)}:${String(block.restSeconds % 60).padStart(2, "0")}`} onChange={(e) => {
                          const match = e.target.value.match(/^(\d+):?(\d{0,2})$/);
                          if (match) {
                            const mins = parseInt(match[1]) || 0;
                            const secs = parseInt(match[2]) || 0;
                            updateBlock(block.id, { restSeconds: mins * 60 + secs });
                          } else if (e.target.value === "") {
                            updateBlock(block.id, { restSeconds: 0 });
                          }
                        }} placeholder="2:00" className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground" />
                      </div>
                      {sport === "run" && (
                        <div>
                          <label className="block text-[10px] text-muted-foreground">Hvile-pace (min/km)</label>
                          <input type="text" value={block.restPace ?? ""} onChange={(e) => updateBlock(block.id, { restPace: e.target.value })} placeholder="6:30" className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Auto-calculated summary */}
              {blocks.length > 0 && (
                <div className="flex gap-4 rounded-md bg-muted/30 p-2 text-xs">
                  <span className="text-muted-foreground">Beregnet: <strong className="text-foreground">{calcDuration} min</strong></span>
                  <span className="text-muted-foreground">TSS: <strong className="text-foreground">{calcTss}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuller</button>
          <button data-testid="session-save" onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Gem aendringer" : "Gem pas"}
          </button>
        </div>
      </div>
    </div>
  );
}
