import { useState } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import {
  useSessions,
  type SessionRange,
} from "@/application/hooks/training/useSessions";
import { useBricks, useDetectBricks } from "@/application/hooks/training/useBricks";
import SessionList from "@/presentation/components/training/SessionList";
import BrickDetail from "@/presentation/components/training/BrickDetail";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { Loader2, Zap, ChevronDown, ChevronUp } from "lucide-react";

const RANGE_OPTIONS: { value: SessionRange; label: string }[] = [
  { value: "30d", label: "30 dage" },
  { value: "90d", label: "90 dage" },
  { value: "all", label: "Al tid" },
];

export default function SessionsPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const activeSports = useAthleteStore((s) => s.getActiveSports)();

  const [range, setRange] = useState<SessionRange>("30d");
  const [sportFilter, setSportFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError } = useSessions(athleteId, range, sportFilter);
  const { data: bricks } = useBricks(athleteId);
  const detectMutation = useDetectBricks(athleteId);
  const [expandedBrick, setExpandedBrick] = useState<string | null>(null);

  const sessions = data?.sessions ?? [];
  const brickList = bricks ?? [];

  return (
    <div data-testid="sessions-page" className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Sessioner</h1>

        {/* Period selector */}
        <div data-testid="period-selector" className="flex gap-1 rounded-lg bg-muted/50 p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              data-testid={`period-${opt.value}`}
              onClick={() => setRange(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                range === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sport filter */}
      <div data-testid="sport-filter" className="flex flex-wrap gap-2">
        <button
          data-testid="sport-filter-all"
          onClick={() => setSportFilter("all")}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            sportFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Alle
        </button>
        {activeSports.map((sc) => (
          <button
            key={sc.sport_key}
            data-testid={`sport-filter-${sc.sport_key}`}
            onClick={() => setSportFilter(sc.sport_key)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              sportFilter === sc.sport_key
                ? "text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            style={
              sportFilter === sc.sport_key
                ? { backgroundColor: sc.color }
                : undefined
            }
          >
            {sc.display_name}
          </button>
        ))}
      </div>

      {/* Error */}
      {isError && (
        <div
          data-testid="sessions-error"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600"
        >
          Der opstod en fejl ved hentning af sessioner. Proev igen senere.
        </div>
      )}

      {/* No athlete */}
      {!athleteId && (
        <div
          data-testid="sessions-no-athlete"
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16"
        >
          <p className="text-sm text-muted-foreground">
            Vaelg en atlet for at se sessioner.
          </p>
        </div>
      )}

      {/* Brick Sessions */}
      {athleteId && brickList.length > 0 && (
        <div data-testid="brick-sessions" className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Brick-sessioner ({brickList.length})
            </h2>
            <button
              data-testid="detect-bricks"
              onClick={() => detectMutation.mutate({})}
              disabled={detectMutation.isPending}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {detectMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              Auto-detect
            </button>
          </div>
          {brickList.map((brick) => (
            <div
              key={brick.id}
              className="rounded-lg border border-border bg-card"
            >
              <button
                data-testid={`brick-row-${brick.id}`}
                onClick={() =>
                  setExpandedBrick(expandedBrick === brick.id ? null : brick.id)
                }
                className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-1">
                    {brick.segments.map((seg) => (
                      <div
                        key={seg.id}
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted"
                      >
                        <SportIcon sport={seg.sport} size={14} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{brick.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(brick.startedAt).toLocaleDateString("da-DK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {brick.t1Seconds != null && (
                        <span className="ml-2 text-amber-400">
                          T1: {Math.floor(brick.t1Seconds / 60)}:{String(brick.t1Seconds % 60).padStart(2, "0")}
                        </span>
                      )}
                      {brick.t2Seconds != null && (
                        <span className="ml-2 text-amber-400">
                          T2: {Math.floor(brick.t2Seconds / 60)}:{String(brick.t2Seconds % 60).padStart(2, "0")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-muted-foreground">
                    {brick.totalTss != null && <span className="mr-3">{brick.totalTss} TSS</span>}
                    {Math.floor(brick.totalDurationSeconds / 3600) > 0
                      ? `${Math.floor(brick.totalDurationSeconds / 3600)}t ${Math.floor((brick.totalDurationSeconds % 3600) / 60)}m`
                      : `${Math.floor(brick.totalDurationSeconds / 60)}m`}
                  </div>
                  {expandedBrick === brick.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
              {expandedBrick === brick.id && (
                <div className="border-t border-border px-3 pb-3">
                  <BrickDetail athleteId={athleteId} brick={brick} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Auto-detect button when no bricks exist yet */}
      {athleteId && brickList.length === 0 && (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border p-4">
          <p className="text-sm text-muted-foreground">
            Ingen brick-sessioner fundet. Koer auto-detektion for at finde multi-sport traening.
          </p>
          <button
            data-testid="detect-bricks-empty"
            onClick={() => detectMutation.mutate({})}
            disabled={detectMutation.isPending}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {detectMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Auto-detect bricks
          </button>
        </div>
      )}

      {/* Session list */}
      {athleteId && (
        <SessionList
          sessions={sessions}
          athleteId={athleteId}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}
    </div>
  );
}
