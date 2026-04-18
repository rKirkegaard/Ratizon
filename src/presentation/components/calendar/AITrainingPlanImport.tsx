import { useState } from "react";
import { createPortal } from "react-dom";
import { Brain, Upload, AlertCircle, Check, Loader2, Trash2, Settings2, ChevronDown } from "lucide-react";
import { apiClient } from "@/application/api/client";
import SessionPicker from "@/presentation/components/ai-coaching/SessionPicker";

interface AITrainingPlanImportProps {
  open: boolean;
  onClose: () => void;
  athleteId: string;
}

const SPORT_LABELS: Record<string, string> = { swim: "Svoemning", bike: "Cykling", run: "Loeb", strength: "Styrke" };

const DETAIL_LEVELS = [
  { value: "minimal", label: "Minimal", desc: "Kun atletprofil + maal + PMC" },
  { value: "standard", label: "Standard", desc: "Profil + maal + PMC + seneste sessioner" },
  { value: "full", label: "Fuld", desc: "Alt: profil, sessioner med laps, wellness, skader, constraints" },
];

interface ParsedSession {
  sport: string;
  scheduled_date: string;
  training_type: string;
  duration_minutes: number;
  tss: number;
  title: string;
  description?: string;
  target_zones?: any;
}

export default function AITrainingPlanImport({ open, onClose, athleteId }: AITrainingPlanImportProps) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ParsedSession[] | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [imported, setImported] = useState(false);

  // Data context configuration
  const [showDataConfig, setShowDataConfig] = useState(false);
  const [sport, setSport] = useState("all");
  const [weeks, setWeeks] = useState(4);
  const [detailLevel, setDetailLevel] = useState("standard");
  const [includeConstraints, setIncludeConstraints] = useState(true);
  const [selectedSessionIds, setSelectedSessionIds] = useState<number[]>([]);

  async function handleParse() {
    if (!text.trim() || text.trim().length < 10) {
      setError("Skriv mindst 10 tegn med din traeningsplan.");
      return;
    }
    setError(null);
    setSessions(null);
    setParsing(true);
    try {
      const res: any = await apiClient.post(`/ai-coaching/${athleteId}/parse-plan`, {
        text,
        sport,
        weeks,
        detailLevel,
        includeConstraints,
        selectedSessionIds: selectedSessionIds.length > 0 ? selectedSessionIds : undefined,
      });
      const data = res?.data ?? res;
      if (data?.parseError) {
        setError(data.parseError + (data.raw ? "\n\nRå AI-svar:\n" + data.raw.slice(0, 500) : ""));
      } else if (data?.sessions && data.sessions.length > 0) {
        setSessions(data.sessions);
        setIsMock(data.isMock ?? false);
      } else if (data?.sessions?.length === 0) {
        setError("AI returnerede ingen sessioner. Proev med en mere detaljeret beskrivelse.");
      } else {
        setError("Uventet svar fra AI.");
      }
    } catch (e: any) {
      const errData = e?.response?.data ?? e?.data;
      const msg = errData?.error ?? errData?.raw ?? e?.message ?? "Fejl ved parsing";
      setError(typeof msg === "string" ? msg : msg?.message ?? "Fejl ved kommunikation med AI");
    }
    setParsing(false);
  }

  async function handleImport() {
    if (!sessions || sessions.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      await apiClient.post(`/ai-coaching/${athleteId}/import-plan`, { sessions });
      setImported(true);
      setTimeout(() => {
        setSessions(null);
        setText("");
        setImported(false);
        onClose();
      }, 1500);
    } catch (e: any) {
      setError(e?.message ?? "Fejl ved import");
    }
    setImporting(false);
  }

  function removeSession(idx: number) {
    setSessions((prev) => prev ? prev.filter((_, i) => i !== idx) : null);
  }

  if (!open) return null;

  return createPortal(
    <div data-testid="ai-plan-import-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-3xl rounded-lg border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-foreground">AI Traeningsplan Import</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Indsaet din traeningsplan som fritekst. AI konverterer den til planlagte sessioner.
        </p>

        {/* Text input */}
        {!sessions && (
          <div className="space-y-3">
            <textarea
              data-testid="plan-text-input"
              value={text}
              onChange={(e) => { setText(e.target.value); setError(null); }}
              placeholder={`Eksempel:\nMandag: 60 min let loeb, zone 2\nTirsdag: 45 min svoemning, 10x100m intervaller\nOnsdag: Hviledag\nTorsdag: 90 min cykling, sweet spot intervaller...`}
              rows={8}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-y"
            />

            {/* Data context configuration */}
            <div className="rounded-lg border border-border/50 bg-muted/10">
              <button
                onClick={() => setShowDataConfig(!showDataConfig)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Settings2 size={12} />
                <span>Data til AI ({DETAIL_LEVELS.find((d) => d.value === detailLevel)?.label})</span>
                <ChevronDown size={12} className={`ml-auto transition-transform ${showDataConfig ? "" : "-rotate-90"}`} />
              </button>

              {showDataConfig && (
                <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-2">
                  {/* Detail level */}
                  <div>
                    <label className="mb-1.5 block text-[10px] font-medium text-muted-foreground">Detaljeniveau for traenigsdata</label>
                    <div className="grid grid-cols-3 gap-2">
                      {DETAIL_LEVELS.map((d) => (
                        <button
                          key={d.value}
                          data-testid={`detail-${d.value}`}
                          onClick={() => setDetailLevel(d.value)}
                          className={`rounded-md border px-3 py-2 text-left transition-colors ${
                            detailLevel === d.value
                              ? "border-purple-500 bg-purple-500/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-purple-500/50"
                          }`}
                        >
                          <span className="block text-xs font-medium">{d.label}</span>
                          <span className="block text-[10px] text-muted-foreground">{d.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Sport focus */}
                    <div>
                      <label className="mb-1 block text-[10px] text-muted-foreground">Sport-fokus</label>
                      <select
                        data-testid="plan-sport-filter"
                        value={sport}
                        onChange={(e) => setSport(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                      >
                        <option value="all">Alle sportsgrene</option>
                        <option value="swim">Svoemning</option>
                        <option value="bike">Cykling</option>
                        <option value="run">Loeb</option>
                      </select>
                    </div>

                    {/* Weeks of data */}
                    <div>
                      <label className="mb-1 block text-[10px] text-muted-foreground">Historik-periode</label>
                      <select
                        data-testid="plan-weeks"
                        value={weeks}
                        onChange={(e) => setWeeks(Number(e.target.value))}
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                      >
                        <option value={1}>1 uge</option>
                        <option value={2}>2 uger</option>
                        <option value={4}>4 uger</option>
                        <option value={8}>8 uger</option>
                        <option value={12}>12 uger</option>
                      </select>
                    </div>

                    {/* Include constraints */}
                    <div className="flex items-end pb-0.5">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeConstraints}
                          onChange={(e) => setIncludeConstraints(e.target.checked)}
                          className="rounded border-border"
                        />
                        Inkluder begraensninger
                      </label>
                    </div>
                  </div>

                  {/* Session picker for full detail */}
                  <SessionPicker
                    athleteId={athleteId}
                    sport={sport}
                    selectedIds={selectedSessionIds}
                    onSelectionChange={setSelectedSessionIds}
                  />

                  <p className="text-[10px] text-muted-foreground">
                    AI modtager: atletprofil (taerskler, vaegt, maal)
                    {detailLevel !== "minimal" && " + seneste sessioner (HR, power, pace, TSS)"}
                    {detailLevel === "full" && " + wellness + laps + skader"}
                    {selectedSessionIds.length > 0 && ` + ${selectedSessionIds.length} udvalgte sessioner med fuld lap-data`}
                    {includeConstraints && " + traeningsbegraaensninger"}
                    {" "}for de seneste {weeks} uger
                    {sport !== "all" && ` (kun ${SPORT_LABELS[sport] ?? sport})`}.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                Annuller
              </button>
              <button
                data-testid="parse-plan-btn"
                onClick={handleParse}
                disabled={parsing || !text.trim()}
                className="flex items-center gap-1.5 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
              >
                {parsing ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
                Analyser med AI
              </button>
            </div>
          </div>
        )}

        {/* Preview parsed sessions */}
        {sessions && (
          <div className="space-y-3">
            {isMock && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-400">
                Mock data — ingen LLM API-noegle konfigureret. Resultatet er simuleret.
              </div>
            )}

            <div className="text-xs text-muted-foreground">{sessions.length} sessioner fundet</div>

            <div className="max-h-[40vh] overflow-y-auto space-y-2">
              {sessions.map((s: any, i) => (
                <div
                  key={i}
                  data-testid={`parsed-session-${i}`}
                  className="rounded-md border border-border bg-muted/20 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        s.sport === "swim" ? "bg-blue-500/10 text-blue-400" :
                        s.sport === "bike" ? "bg-amber-500/10 text-amber-400" :
                        s.sport === "run" ? "bg-green-500/10 text-green-400" :
                        "bg-purple-500/10 text-purple-400"
                      }`}>
                        {SPORT_LABELS[s.sport] ?? s.sport}
                      </span>
                      <span className="text-sm font-medium text-foreground">{s.title}</span>
                    </div>
                    <button onClick={() => removeSession(i)} className="text-muted-foreground hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-0.5 flex gap-3 text-[10px] text-muted-foreground">
                    <span>{s.scheduled_date}</span>
                    <span>{s.duration_minutes} min</span>
                    <span>TSS {s.tss}</span>
                    <span>{s.training_type}</span>
                  </div>
                  {s.description && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{s.description}</p>
                  )}
                  {/* Session blocks preview */}
                  {Array.isArray(s.session_blocks) && s.session_blocks.length > 0 && (
                    <div className="mt-1.5 space-y-0.5 border-t border-border/30 pt-1.5">
                      {s.session_blocks.map((block: any, bi: number) => {
                        const dur = block.durationSeconds ? `${Math.round(block.durationSeconds / 60)}min` : "";
                        const typeLabel = block.type === "warmup" ? "Opvarmning" : block.type === "cooldown" ? "Nedkoeling" : block.type === "interval" ? "Interval" : "Steady";
                        return (
                          <div key={bi} className="flex items-center gap-2 text-[10px]">
                            <span className={`w-16 font-medium ${
                              block.type === "warmup" ? "text-blue-400" :
                              block.type === "cooldown" ? "text-blue-400" :
                              block.type === "interval" ? "text-orange-400" :
                              "text-emerald-400"
                            }`}>{typeLabel}</span>
                            <span className="text-muted-foreground">
                              {block.repeatCount > 1 ? `${block.repeatCount}x` : ""}{dur}
                              {block.targetPace ? ` @ ${block.targetPace}` : ""}
                              {block.targetPower ? ` @ ${block.targetPower}W` : ""}
                              {block.targetHrZone ? ` Z${block.targetHrZone}` : ""}
                              {block.restSeconds > 0 ? ` (${Math.round(block.restSeconds / 60)}min pause${block.restPace ? ` @ ${block.restPace}` : ""})` : ""}
                            </span>
                            {block.description && <span className="text-muted-foreground/60">— {block.description}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}

            {imported && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">{sessions.length} sessioner importeret!</span>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => { setSessions(null); setError(null); }}
                className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Tilbage
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                  Annuller
                </button>
                <button
                  data-testid="import-parsed-plan-btn"
                  onClick={handleImport}
                  disabled={importing || imported || sessions.length === 0}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Importer {sessions.length} sessioner
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
