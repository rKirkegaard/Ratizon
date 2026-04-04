import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { formatDuration, formatDistance } from "@/domain/utils/formatters";
import type { WeeklyReportSession } from "@/application/hooks/analytics/useAnalytics";

interface WeeklySessionListProps {
  sessions: WeeklyReportSession[];
}

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("da-DK", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function tssBadgeColor(tss: number | null): string {
  if (tss === null) return "bg-muted text-muted-foreground";
  if (tss < 100) return "bg-green-500/15 text-green-600";
  if (tss < 200) return "bg-amber-500/15 text-amber-600";
  return "bg-red-500/15 text-red-600";
}

function SessionRowSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border/50 bg-card p-4">
      <div className="flex items-center gap-4">
        <div className="h-9 w-9 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
        <div className="h-4 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function WeeklySessionList({ sessions }: WeeklySessionListProps) {
  if (sessions.length === 0) {
    return (
      <div
        data-testid="weekly-session-list"
        className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12"
      >
        <p className="text-sm text-muted-foreground">
          Ingen sessioner i denne uge.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="weekly-session-list" className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Sessioner</h3>
      {sessions.map((session) => (
        <div
          key={session.id}
          data-testid="weekly-session-row"
          className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 transition-colors hover:border-border"
        >
          {/* Sport icon */}
          <SportIcon sport={session.sport} size={22} />

          {/* Date + title */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {formatSessionDate(session.startedAt)}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {session.title || session.sessionType}
            </p>
          </div>

          {/* Distance */}
          <div className="hidden text-right sm:block">
            <span className="text-sm font-medium text-foreground">
              {session.distanceMeters
                ? formatDistance(session.distanceMeters)
                : "–"}
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
        </div>
      ))}
    </div>
  );
}

export { SessionRowSkeleton };
