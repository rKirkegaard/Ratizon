import { useState, useRef } from "react";
import { Upload, AlertCircle, ChevronDown, FileJson, Loader2 } from "lucide-react";
import { apiClient } from "@/application/api/client";

interface ImportPlanModalProps {
  open: boolean;
  onClose: () => void;
  athleteId: string;
}

const TRAINING_TYPE_LABELS: Record<string, string> = {
  endurance: "Udholdenhed", tempo: "Tempo", sweet_spot: "Sweet Spot",
  threshold: "Taerskel", vo2max: "VO2max", recovery: "Restitution",
  interval: "Interval", race: "Konkurrence",
};

export default function ImportPlanModal({ open, onClose, athleteId }: ImportPlanModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setJsonText(reader.result as string);
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    setError(null);
    if (!jsonText.trim()) { setError("Indsaet eller upload JSON foerst."); return; }

    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.sessions || !Array.isArray(parsed.sessions)) {
        throw new Error('JSON skal indeholde et "sessions" array');
      }

      // Validate each session
      const validated = parsed.sessions.map((s: any, i: number) => {
        if (!s.sport || !["swim", "bike", "run"].includes(s.sport))
          throw new Error(`Session ${i + 1}: Ugyldig sport (skal vaere swim, bike eller run)`);
        if (!s.scheduled_date) throw new Error(`Session ${i + 1}: Mangler scheduled_date`);
        if (!s.training_type) throw new Error(`Session ${i + 1}: Mangler training_type`);
        if (!s.duration_minutes || s.duration_minutes <= 0) throw new Error(`Session ${i + 1}: Ugyldig duration_minutes`);
        if (s.tss === undefined || s.tss < 0) throw new Error(`Session ${i + 1}: Ugyldig tss vaerdi`);
        return {
          ...s,
          id: s.id || `imported_${Date.now()}_${i}`,
          athlete_id: athleteId,
          title: s.title || `${TRAINING_TYPE_LABELS[s.training_type] ?? s.training_type} ${s.sport}`,
        };
      });

      setImporting(true);
      await apiClient.post("/planning/planned-sessions/import", {
        athleteId,
        sessions: validated,
      });
      setImporting(false);
      setJsonText("");
      onClose();
    } catch (e: any) {
      setImporting(false);
      setError(e instanceof SyntaxError ? "Ugyldig JSON format" : e.message);
    }
  };

  if (!open) return null;

  return (
    <div data-testid="import-plan-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-lg border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <FileJson className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Importer Traeningsplan (JSON)</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">Upload en JSON-fil med planlagte traeninger eller indsaet JSON direkte.</p>

        <div className="space-y-4">
          {/* File upload */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted-foreground">Upload JSON-fil</label>
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent">
                <Upload size={14} /> Vaelg fil
              </button>
              {jsonText && <span className="self-center text-xs text-muted-foreground">{jsonText.length} tegn loaded</span>}
            </div>
          </div>

          {/* JSON textarea */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted-foreground">Eller indsaet JSON direkte</label>
            <textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setError(null); }}
              placeholder='{"sessions": [...]}'
              rows={10}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground resize-y"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Collapsible JSON structure docs */}
          <div>
            <button onClick={() => setShowDocs(!showDocs)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground py-1">
              <ChevronDown size={14} className={`transition-transform ${showDocs ? "" : "-rotate-90"}`} />
              <FileJson size={14} />
              JSON Struktur (til LLM eller manuel oprettelse)
            </button>
            {showDocs && (
              <div className="mt-2 rounded-lg bg-muted/30 p-4 overflow-x-auto">
                <pre className="text-xs font-mono text-foreground whitespace-pre">{`{
  "sessions": [
    {
      "sport": "swim" | "bike" | "run",
      "scheduled_date": "2026-04-20",
      "training_type": "endurance" | "tempo" | "threshold" | "vo2max" | "recovery" | "interval" | "race",
      "duration_minutes": 90,
      "tss": 85,
      "title": "Interval traening",
      "description": "Pyramide intervaller",
      "warmup": {
        "duration_minutes": 15,
        "description": "Let opvarmning"
      },
      "main_set": {
        "sets": [
          {
            "repetitions": 3,
            "rest_between_sets_seconds": 300,
            "intervals": [
              {
                "duration_minutes": 5,
                "intensity_zone": 4,
                "rest_seconds": 60,
                "description": "Tempo pace"
              }
            ]
          }
        ]
      },
      "cooldown": {
        "duration_minutes": 10,
        "description": "Let nedkoeling"
      }
    }
  ]
}`}</pre>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  <strong>Paakraevede felter:</strong> sport, scheduled_date, training_type, duration_minutes, tss
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuller</button>
          <button onClick={handleImport} disabled={importing || !jsonText.trim()} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Importer
          </button>
        </div>
      </div>
    </div>
  );
}
