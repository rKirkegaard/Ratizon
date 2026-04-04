import { CalendarClock } from "lucide-react";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { formatDuration } from "@/domain/utils/formatters";
import type { PlannedSession } from "@/application/hooks/useDashboard";

interface UpcomingSessionsProps {
  sessions: PlannedSession[];
}

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("da-DK", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function UpcomingSessions({ sessions }: UpcomingSessionsProps) {
  return (
    <div
      data-testid="upcoming-sessions"
      className="rounded-lg border border-border/50 bg-card p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Kommende Sessioner</h3>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen kommende sessioner planlagt</p>
      ) : (
        <ul className="space-y-2">
          {sessions.slice(0, 3).map((session) => (
            <li
              key={session.id}
              data-testid="upcoming-session-item"
              className="flex items-center gap-3 rounded-md bg-accent/30 px-3 py-2"
            >
              <SportIcon sport={session.sport} size={16} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {session.title || session.type}
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDuration(session.duration_seconds)}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatSessionDate(session.date)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
