import { useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { formatDuration, formatDistance } from "@/domain/utils/formatters";
import type { Session } from "@/domain/types/training.types";
import SessionDetail from "./SessionDetail";

interface SessionListProps {
  sessions: Session[];
  athleteId: string;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function SessionRowSkeleton() {
  return (
    <div
      data-testid="session-skeleton"
      className="animate-pulse rounded-lg border border-border/50 bg-card p-4"
    >
      <div className="flex items-center gap-4">
        <div className="h-9 w-9 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="h-4 w-12 rounded bg-muted" />
      </div>
    </div>
  );
}

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("da-DK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSessionTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tssBadgeColor(tss: number | null): string {
  if (tss === null) return "bg-muted text-muted-foreground";
  if (tss < 100) return "bg-green-500/15 text-green-600";
  if (tss < 200) return "bg-amber-500/15 text-amber-600";
  return "bg-red-500/15 text-red-600";
}

interface SessionRowProps {
  session: Session;
  athleteId: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function SessionRow({ session, athleteId, isExpanded, onToggle }: SessionRowProps) {
  return (
    <div
      data-testid="session-row"
      className="rounded-lg border border-border/50 bg-card transition-colors hover:border-border"
    >
      {/* Collapsed row */}
      <button
        data-testid="session-row-toggle"
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={onToggle}
      >
        {/* Sport icon */}
        <SportIcon sport={session.sport} size={22} />

        {/* Date + title */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {formatSessionDate(session.startedAt)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatSessionTime(session.startedAt)}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {session.title || session.sessionType}
          </p>
        </div>

        {/* Distance */}
        <div className="hidden text-right sm:block">
          <span className="text-sm font-medium text-foreground">
            {session.distanceMeters ? formatDistance(session.distanceMeters) : "–"}
          </span>
        </div>

        {/* Duration */}
        <div className="text-right">
          <span className="text-sm font-medium text-foreground">
            {formatDuration(session.durationSeconds)}
          </span>
        </div>

        {/* Avg HR */}
        <div className="hidden text-right md:block">
          <span className="text-sm text-muted-foreground">
            {session.avgHr ? `${Math.round(session.avgHr)} bpm` : "–"}
          </span>
        </div>

        {/* TSS badge */}
        <div className="hidden sm:block">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tssBadgeColor(session.tss)}`}
          >
            {session.tss != null ? Math.round(session.tss) : "–"} TSS
          </span>
        </div>

        {/* Chevron */}
        <span className="text-muted-foreground">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-border/50 p-4">
          <SessionDetail athleteId={athleteId} sessionId={session.id} />
        </div>
      )}
    </div>
  );
}

export default function SessionList({
  sessions,
  athleteId,
  isLoading,
  searchQuery,
  onSearchChange,
}: SessionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredSessions = searchQuery.trim()
    ? sessions.filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
          s.title?.toLowerCase().includes(q) ||
          s.sessionType.toLowerCase().includes(q) ||
          s.sport.toLowerCase().includes(q)
        );
      })
    : sessions;

  return (
    <div data-testid="session-list" className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          data-testid="session-search"
          type="text"
          placeholder="Sog efter session..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SessionRowSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredSessions.length === 0 && (
        <div
          data-testid="session-list-empty"
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12"
        >
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? "Ingen sessioner matcher din sogning."
              : "Ingen sessioner fundet i den valgte periode."}
          </p>
        </div>
      )}

      {/* Session rows */}
      {!isLoading &&
        filteredSessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            athleteId={athleteId}
            isExpanded={expandedId === session.id}
            onToggle={() =>
              setExpandedId((prev) => (prev === session.id ? null : session.id))
            }
          />
        ))}
    </div>
  );
}
