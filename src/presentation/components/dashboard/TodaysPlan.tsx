import { Calendar } from "lucide-react";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { formatDuration } from "@/domain/utils/formatters";
import type { PlannedSession } from "@/application/hooks/useDashboard";

interface TodaysPlanProps {
  sessions: PlannedSession[];
}

export default function TodaysPlan({ sessions }: TodaysPlanProps) {
  return (
    <div
      data-testid="todays-plan"
      className="rounded-lg border border-border/50 bg-card p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <Calendar size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Dagens Plan</h3>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Hviledag - Ingen planlagte sessioner</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li
              key={session.id}
              data-testid="planned-session-item"
              className="flex items-start gap-3"
            >
              <SportIcon sport={session.sport} size={20} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {session.title || session.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(session.duration_seconds)}
                  </span>
                </div>
                {session.purpose && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {session.purpose}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
