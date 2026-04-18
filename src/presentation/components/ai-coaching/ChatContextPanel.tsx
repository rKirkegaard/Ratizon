import { useState } from "react";
import { Settings2, ChevronDown, Eye, EyeOff } from "lucide-react";

interface ChatContextPanelProps {
  onContextChange: (context: { sport: string; weeks: number; customContext: string }) => void;
  currentContext: { sport: string; weeks: number; customContext: string };
}

export default function ChatContextPanel({ onContextChange, currentContext }: ChatContextPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  function handleChange(key: string, value: any) {
    onContextChange({ ...currentContext, [key]: value });
  }

  return (
    <div data-testid="chat-context-panel" className="border-t border-border bg-muted/10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Settings2 size={12} />
        <span>Kontekst-indstillinger</span>
        <ChevronDown size={12} className={`ml-auto transition-transform ${expanded ? "" : "-rotate-90"}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          <div className="flex gap-3">
            {/* Sport filter */}
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-muted-foreground">Sport-filter</label>
              <select
                data-testid="ctx-sport-filter"
                value={currentContext.sport}
                onChange={(e) => handleChange("sport", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                <option value="all">Alle sportsgrene</option>
                <option value="swim">Svoemning</option>
                <option value="bike">Cykling</option>
                <option value="run">Loeb</option>
              </select>
            </div>

            {/* Week visibility */}
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-muted-foreground">Uge-visibility</label>
              <select
                data-testid="ctx-week-range"
                value={currentContext.weeks}
                onChange={(e) => handleChange("weeks", Number(e.target.value))}
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                <option value={1}>1 uge</option>
                <option value={2}>2 uger</option>
                <option value={4}>4 uger</option>
                <option value={8}>8 uger</option>
                <option value={12}>12 uger</option>
              </select>
            </div>
          </div>

          {/* Custom context */}
          <div>
            <label className="mb-1 block text-[10px] text-muted-foreground">Ekstra kontekst til AI</label>
            <textarea
              data-testid="ctx-custom-context"
              value={currentContext.customContext}
              onChange={(e) => handleChange("customContext", e.target.value)}
              placeholder="F.eks. 'Jeg har en knaeskade der begraenser loebedistance' eller 'Fokus paa Z2-base denne maaned'"
              rows={2}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Context preview toggle */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            {showPreview ? <EyeOff size={10} /> : <Eye size={10} />}
            {showPreview ? "Skjul kontekst-preview" : "Vis kontekst-preview"}
          </button>

          {showPreview && (
            <div className="rounded-lg bg-muted/30 border border-border p-2 max-h-32 overflow-y-auto">
              <p className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap">
                Sport: {currentContext.sport === "all" ? "Alle" : currentContext.sport}{"\n"}
                Data range: {currentContext.weeks} uger{"\n"}
                {currentContext.customContext ? `Custom: ${currentContext.customContext}\n` : ""}
                AI modtager: atletprofil + seneste sessioner (filtreret) + wellness + PMC data
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
