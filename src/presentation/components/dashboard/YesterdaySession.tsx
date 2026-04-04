import { Clock } from "lucide-react";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { formatDuration, formatDistance } from "@/domain/utils/formatters";
import type { CompletedSession } from "@/application/hooks/useDashboard";

interface YesterdaySessionProps {
  sessions: CompletedSession[];
}

const qualityLabels: Record<string, { label: string; color: string }> = {
  good: { label: "God", color: "text-green-500" },
  moderate: { label: "Moderat", color: "text-yellow-500" },
  poor: { label: "Darlig", color: "text-red-500" },
};

export default function YesterdaySession({ sessions }: YesterdaySessionProps) {
  return (
    <div
      data-testid="yesterday-session"
      className="rounded-lg border border-border/50 bg-card p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <Clock size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Gaarsdagens Session</h3>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen traening i gaar</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li
              key={session.id}
              data-testid="yesterday-session-item"
              className="flex items-start gap-3"
            >
              <SportIcon sport={session.sport} size={20} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {session.title || session.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(session.duration_seconds)}
                  </span>
                  {session.distance_meters != null && session.distance_meters > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistance(session.distance_meters)}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {session.tss != null && (
                    <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-foreground">
                      TSS {Math.round(session.tss)}
                    </span>
                  )}
                  {session.quality && qualityLabels[session.quality] && (
                    <span
                      className={`text-xs font-medium ${qualityLabels[session.quality].color}`}
                    >
                      {qualityLabels[session.quality].label}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
