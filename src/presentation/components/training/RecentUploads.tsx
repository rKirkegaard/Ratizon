import type { Session } from "@/domain/types/training.types";
import { SportIcon } from "@/presentation/components/shared/SportIcon";

interface RecentUploadsProps {
  sessions: Session[];
  isLoading: boolean;
  onDelete: (sessionId: string) => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}t ${m}m`;
  return `${m}m`;
}

function formatDistance(meters: number | null): string {
  if (meters === null) return "–";
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

export default function RecentUploads({
  sessions,
  isLoading,
  onDelete,
}: RecentUploadsProps) {
  if (isLoading) {
    return (
      <div data-testid="recent-uploads" className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg border border-border/50 bg-muted"
          />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div
        data-testid="recent-uploads"
        className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ingen uploads endnu. Upload en FIT/TCX fil for at komme i gang.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="recent-uploads" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Seneste uploads ({sessions.length})
      </h3>

      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <SportIcon sport={session.sport} size={18} />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {session.title || session.sessionType}
                </p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{formatDate(session.startedAt)}</span>
                  <span>{formatDistance(session.distanceMeters)}</span>
                  <span>{formatDuration(session.durationSeconds)}</span>
                  {session.tss !== null && <span>TSS: {Math.round(session.tss)}</span>}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDelete(session.id)}
              className="rounded p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
              title="Slet session"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
