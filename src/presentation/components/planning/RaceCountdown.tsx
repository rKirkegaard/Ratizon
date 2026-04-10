import type { Goal } from "@/domain/types/planning.types";

interface RaceCountdownProps {
  goal: Goal | null;
  isLoading: boolean;
}

function daysBetween(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function RaceCountdown({ goal, isLoading }: RaceCountdownProps) {
  if (isLoading) {
    return (
      <div
        data-testid="race-countdown"
        className="h-40 animate-pulse rounded-lg border border-border/50 bg-muted"
      />
    );
  }

  if (!goal || !goal.targetDate) {
    return (
      <div
        data-testid="race-countdown"
        className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ingen hovedmaal sat endnu. Opret et A-maal for at se nedtaelling.
        </p>
      </div>
    );
  }

  const daysLeft = daysBetween(goal.targetDate);
  const isPast = daysLeft < 0;

  return (
    <div
      data-testid="race-countdown"
      className="rounded-lg border border-border bg-card p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {goal.racePriority === "A" ? "HOVEDMAAL" : "NAESTE DELMAAL"}
          </p>
          <h2 className="mt-1 text-xl font-bold text-foreground">{goal.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(goal.targetDate)}
            {goal.sport && (
              <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs">
                {goal.sport}
              </span>
            )}
          </p>
          {goal.racePriority && (
            <span
              className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-bold ${
                goal.racePriority === "A"
                  ? "bg-red-500/20 text-red-400"
                  : goal.racePriority === "B"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-blue-500/20 text-blue-400"
              }`}
            >
              {goal.racePriority}-loeb
            </span>
          )}
        </div>
        <div className="text-right">
          <p
            className={`text-5xl font-black tabular-nums ${
              isPast ? "text-muted-foreground" : "text-primary"
            }`}
          >
            {isPast ? 0 : daysLeft}
          </p>
          <p className="text-sm font-medium text-muted-foreground">
            {isPast ? "Overstaaet" : "dage tilbage"}
          </p>
        </div>
      </div>
    </div>
  );
}
