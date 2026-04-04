import { StatCard } from "@/presentation/components/shared/StatCard";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { formatDuration, formatNumber } from "@/domain/utils/formatters";
import type { Session } from "@/domain/types/training.types";

interface StrengthOverviewProps {
  sessions: Session[];
  isLoading: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="mt-3 h-8 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded bg-muted/30" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StrengthOverview({ sessions, isLoading }: StrengthOverviewProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const strengthColor = getSportColor("strength");

  if (isLoading) {
    return (
      <div data-testid="strength-overview">
        <ChartSkeleton />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div data-testid="strength-overview">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            Styrketraeningsanalyse kommer snart — sessioner logges allerede via FIT-upload
          </p>
        </div>
      </div>
    );
  }

  const totalDurationSec = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const avgDurationSec =
    sessions.length > 0 ? Math.round(totalDurationSec / sessions.length) : 0;

  // Sort by date descending for recent sessions
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 10);

  return (
    <div data-testid="strength-overview" className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Sessioner"
          value={formatNumber(sessions.length)}
          accentColor={strengthColor}
        />
        <StatCard
          label="Total varighed"
          value={formatDuration(totalDurationSec)}
          accentColor={strengthColor}
        />
        <StatCard
          label="Gns. varighed"
          value={formatDuration(avgDurationSec)}
          accentColor={strengthColor}
        />
      </div>

      {/* Recent sessions */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Seneste sessioner
        </h3>
        <div className="space-y-2">
          {recentSessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(s.startedAt)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDuration(s.durationSeconds)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
