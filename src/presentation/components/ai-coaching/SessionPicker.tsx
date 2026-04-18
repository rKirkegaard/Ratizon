import { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useSessions } from "@/application/hooks/training/useSessions";

interface SessionPickerProps {
  athleteId: string;
  sport: string;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
}

const SPORT_COLORS: Record<string, string> = {
  swim: "bg-blue-500/10 text-blue-400",
  bike: "bg-amber-500/10 text-amber-400",
  run: "bg-green-500/10 text-green-400",
  strength: "bg-purple-500/10 text-purple-400",
};

export default function SessionPicker({ athleteId, sport, selectedIds, onSelectionChange }: SessionPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const { data: rawData, isLoading } = useSessions(athleteId, "90d", sport === "all" ? undefined : sport);

  const raw = (rawData as any)?.data ?? rawData;
  const allSessions = (Array.isArray(raw) ? raw : raw?.sessions ?? []) as any[];
  const sessions = allSessions
    .filter((s: any) => !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.sport?.includes(search.toLowerCase()))
    .slice(0, 30);

  function toggle(id: number) {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  }

  return (
    <div data-testid="session-picker">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left text-xs text-muted-foreground hover:text-foreground py-1"
      >
        <ChevronDown size={12} className={`transition-transform ${expanded ? "" : "-rotate-90"}`} />
        Vaelg sessioner med fuld detalje ({selectedIds.length} valgt)
      </button>

      {expanded && (
        <div className="mt-1 rounded-lg border border-border bg-background max-h-48 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border">
            <Search size={12} className="text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Soeg sessioner..."
              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
            {selectedIds.length > 0 && (
              <button onClick={() => onSelectionChange([])} className="text-[10px] text-muted-foreground hover:text-foreground">
                Ryd
              </button>
            )}
          </div>

          {/* Session list */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-3 text-xs text-muted-foreground text-center">Henter sessioner...</div>
            ) : sessions.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground text-center">Ingen sessioner fundet</div>
            ) : (
              sessions.map((s: any) => {
                const id = Number(s.id);
                const selected = selectedIds.includes(id);
                const dur = s.durationSeconds ? `${Math.round(s.durationSeconds / 60)}min` : "";
                const date = s.startedAt ? new Date(s.startedAt).toLocaleDateString("da-DK", { day: "numeric", month: "short" }) : "";

                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(id)}
                    className={`flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-muted/30 transition-colors ${selected ? "bg-primary/5" : ""}`}
                  >
                    <div className={`flex items-center justify-center w-4 h-4 rounded border ${selected ? "bg-primary border-primary" : "border-border"}`}>
                      {selected && <Check size={10} className="text-primary-foreground" />}
                    </div>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${SPORT_COLORS[s.sport] ?? "text-muted-foreground"}`}>
                      {s.sport}
                    </span>
                    <span className="text-xs text-foreground truncate flex-1">{s.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{date}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{dur}</span>
                    {s.tss && <span className="text-[10px] text-muted-foreground shrink-0">TSS {Math.round(s.tss)}</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
