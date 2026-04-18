import { useState, useEffect } from "react";
import { Bot, Save } from "lucide-react";
import { useCoachingPreferences, useUpdateCoachingPreferences } from "@/application/hooks/ai-coaching/useAICoaching";

interface AICoachingPreferencesProps {
  athleteId: string;
}

const STYLES = [
  { value: "concise", label: "Koncis", desc: "Korte, praecise svar" },
  { value: "detailed", label: "Detaljeret", desc: "Grundige forklaringer" },
  { value: "motivational", label: "Motiverende", desc: "Opmuntrende tone" },
];

const FOCUS_OPTIONS = [
  { value: "endurance", label: "Udholdenhed" },
  { value: "speed", label: "Fart" },
  { value: "recovery", label: "Restitution" },
  { value: "nutrition", label: "Ernaering" },
  { value: "technique", label: "Teknik" },
  { value: "mental", label: "Mental traening" },
];

export default function AICoachingPreferences({ athleteId }: AICoachingPreferencesProps) {
  const { data: rawPrefs, isLoading } = useCoachingPreferences(athleteId);
  const updateMutation = useUpdateCoachingPreferences(athleteId);

  const prefs = rawPrefs as any;

  const [style, setStyle] = useState("concise");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [autoSuggestions, setAutoSuggestions] = useState(true);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (prefs) {
      setStyle(prefs.communicationStyle ?? "concise");
      setFocusAreas(Array.isArray(prefs.focusAreas) ? prefs.focusAreas : []);
      setAutoSuggestions(prefs.autoSuggestions ?? true);
      setDirty(false);
    }
  }, [prefs]);

  function toggleFocus(value: string) {
    setDirty(true);
    setFocusAreas((prev) => prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]);
  }

  function handleSave() {
    updateMutation.mutate(
      { communicationStyle: style, focusAreas, autoSuggestions },
      { onSuccess: () => setDirty(false) }
    );
  }

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-lg border border-border bg-card" />;
  }

  return (
    <div data-testid="ai-coaching-preferences" className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-purple-400" />
        <h2 className="text-base font-semibold text-foreground">AI Coaching Praeferencer</h2>
      </div>

      {/* Communication style */}
      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">Kommunikationsstil</label>
        <div className="grid grid-cols-3 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.value}
              data-testid={`style-${s.value}`}
              onClick={() => { setStyle(s.value); setDirty(true); }}
              className={`rounded-md border px-3 py-2 text-left transition-colors ${
                style === s.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              <span className="block text-sm font-medium">{s.label}</span>
              <span className="block text-[10px] text-muted-foreground">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Focus areas */}
      <div>
        <label className="mb-2 block text-xs font-medium text-muted-foreground">Fokusomraader</label>
        <div className="flex flex-wrap gap-2">
          {FOCUS_OPTIONS.map((f) => (
            <button
              key={f.value}
              data-testid={`focus-${f.value}`}
              onClick={() => toggleFocus(f.value)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                focusAreas.includes(f.value)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-suggestions toggle */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-foreground">Auto-forslag</span>
          <p className="text-[10px] text-muted-foreground">Generer automatisk feedback efter upload</p>
        </div>
        <button
          data-testid="auto-suggestions-toggle"
          onClick={() => { setAutoSuggestions(!autoSuggestions); setDirty(true); }}
          className={`relative h-6 w-11 rounded-full transition-colors ${autoSuggestions ? "bg-primary" : "bg-muted"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${autoSuggestions ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {/* Save */}
      <button
        data-testid="save-coaching-prefs"
        onClick={handleSave}
        disabled={!dirty || updateMutation.isPending}
        className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {updateMutation.isPending ? "Gemmer..." : "Gem praeferencer"}
      </button>
    </div>
  );
}
