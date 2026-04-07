import { useState, useMemo, lazy, Suspense } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import {
  useSessions,
  type SessionRange,
} from "@/application/hooks/training/useSessions";
import { useBricks, useDetectBricks } from "@/application/hooks/training/useBricks";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import BrickDetail from "@/presentation/components/training/BrickDetail";
import SessionAnalysisPage from "@/presentation/pages/SessionAnalysisPage";
import { formatDuration, formatDistance } from "@/domain/utils/formatters";
import { Search, Loader2, Zap, ChevronDown, ChevronUp, ExternalLink, X } from "lucide-react";

const RANGE_OPTIONS: { value: SessionRange; label: string }[] = [
  { value: "30d", label: "30 dage" },
  { value: "90d", label: "90 dage" },
  { value: "all", label: "Al tid" },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}

function getSessionTypeLabel(t: string): string {
  const map: Record<string, string> = {
    recovery: "Restitution", endurance: "Udholdenhed", tempo: "Tempo",
    sweet_spot: "Sweet Spot", threshold: "Threshold", vo2max: "VO2Max",
    anaerobic: "Anaerobic",
  };
  return map[t] || t;
}

export default function SessionsPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const activeSports = useAthleteStore((s) => s.getActiveSports)();
  const getSportColor = useAthleteStore((s) => s.getSportColor);

  const [range, setRange] = useState<SessionRange>("30d");
  const [sportFilter, setSportFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedBrick, setExpandedBrick] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data, isLoading, isError } = useSessions(athleteId, range, sportFilter === "all" ? undefined : sportFilter);
  const { data: bricks } = useBricks(athleteId);
  const detectMutation = useDetectBricks(athleteId);

  const sessions = data?.sessions ?? [];
  const brickList = bricks ?? [];

  // Filter by search
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) =>
      (s.title?.toLowerCase().includes(q)) ||
      (s.sessionType?.toLowerCase().includes(q)) ||
      (s.sport?.toLowerCase().includes(q))
    );
  }, [sessions, searchQuery]);

  if (!athleteId) {
    return (
      <div data-testid="sessions-page" className="p-4 md:p-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Sessioner</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">Vaelg en atlet for at se sessioner.</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="sessions-page" className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          Sessioner
          {!isLoading && <span className="ml-2 text-base font-normal text-muted-foreground">({filteredSessions.length})</span>}
          {isLoading && <span className="ml-2 text-base font-normal text-muted-foreground">Indlaeser...</span>}
        </h1>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              data-testid="session-search"
              type="text"
              placeholder="Soeg type eller sport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Sport filter */}
          <select
            data-testid="sport-filter-select"
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="w-40 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          >
            <option value="all">Alle sportsgrene</option>
            {activeSports.map((sc) => (
              <option key={sc.sport_key} value={sc.sport_key}>{sc.display_name}</option>
            ))}
          </select>

          {/* Period selector */}
          <div data-testid="period-selector" className="flex gap-1 rounded-lg bg-muted/50 p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                data-testid={`period-${opt.value}`}
                onClick={() => setRange(opt.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === opt.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
          Der opstod en fejl ved hentning af sessioner.
        </div>
      )}

      {/* Brick sessions */}
      {brickList.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Brick-sessioner ({brickList.length})</h2>
            <button onClick={() => detectMutation.mutate({})} disabled={detectMutation.isPending} className="flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-50">
              {detectMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />} Auto-detect
            </button>
          </div>
          {brickList.map((brick) => (
            <div key={brick.id} className="rounded-lg border border-border bg-card">
              <button onClick={() => setExpandedBrick(expandedBrick === brick.id ? null : brick.id)} className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-1">
                    {brick.segments.map((seg) => <div key={seg.id} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted"><SportIcon sport={seg.sport} size={14} /></div>)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{brick.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(brick.startedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {brick.totalTss != null && <span>{brick.totalTss} TSS</span>}
                  <span>{formatDuration(brick.totalDurationSeconds)}</span>
                  {expandedBrick === brick.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>
              {expandedBrick === brick.id && athleteId && (
                <div className="border-t border-border px-3 pb-3"><BrickDetail athleteId={athleteId} brick={brick} /></div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sessions list — IronCoach style */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" />)}</div>
      ) : filteredSessions.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">Ingen sessioner matcher dine filtre. Proev at justere soegningen.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              data-testid={`session-row-${session.id}`}
              className="flex items-center justify-between rounded-lg border border-border/40 p-3 hover:bg-muted/10 transition-colors"
            >
              {/* Left: Sport icon + info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${getSportColor(session.sport)}20` }}>
                  <SportIcon sport={session.sport} size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {getSessionTypeLabel(session.sessionType)} {session.title !== session.sessionType ? `— ${session.title}` : ""}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-muted-foreground/50">#{session.id}</span>
                    <span>{formatDate(session.startedAt)}</span>
                    <span>·</span>
                    <span>{formatDuration(session.durationSeconds)}</span>
                    {session.distanceMeters != null && session.distanceMeters > 0 && (
                      <><span>·</span><span>{formatDistance(session.distanceMeters)}</span></>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Metrics + badge + button */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Key metrics */}
                <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
                  {session.avgHr != null && <span>HR {session.avgHr}</span>}
                  {session.avgPower != null && <span>{session.avgPower}W</span>}
                  {session.tss != null && (
                    <span className="flex items-center gap-0.5 font-medium text-foreground">
                      <Zap className="h-3 w-3 text-amber-400" /> {Math.round(session.tss)}
                    </span>
                  )}
                </div>

                {/* Sport badge */}
                <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                  {session.sport}
                </span>

                {/* Details button */}
                <button
                  onClick={() => setSelectedSessionId(selectedSessionId === session.id ? null : session.id)}
                  className={`flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedSessionId === session.id ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {selectedSessionId === session.id ? "Luk" : "Detaljer"} <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sheet panel — slides in from right like IronCoach */}
      {selectedSessionId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300" onClick={() => setSelectedSessionId(null)} />
          <div className="fixed inset-y-0 right-0 z-50 h-full w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto border-l border-border bg-background p-6 shadow-lg transition-transform duration-500 ease-in-out">
            <div className="flex items-center justify-between mb-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                {(() => {
                  const s = filteredSessions.find(s => s.id === selectedSessionId);
                  if (!s) return "Sessionsanalyse";
                  return (<>
                    <SportIcon sport={s.sport} size={20} />
                    {getSessionTypeLabel(s.sessionType)} — {formatDate(s.startedAt)}
                  </>);
                })()}
              </h2>
              <button onClick={() => setSelectedSessionId(null)} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
                <X size={16} />
              </button>
            </div>
            <SessionAnalysisPage sessionIdProp={selectedSessionId} />
          </div>
        </>
      )}
    </div>
  );
}
