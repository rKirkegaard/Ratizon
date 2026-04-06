import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useWeeklyReport } from "@/application/hooks/analytics/useAnalytics";
import { StatCard } from "@/presentation/components/shared/StatCard";
import DisciplineBalance from "@/presentation/components/analytics/DisciplineBalance";
import WeeklyZoneChart from "@/presentation/components/analytics/WeeklyZoneChart";
import WeeklySessionList from "@/presentation/components/analytics/WeeklySessionList";
import { formatDuration, formatNumber } from "@/domain/utils/formatters";

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-card p-4">
      <div className="h-3 w-20 rounded bg-muted" />
      <div className="mt-2 h-7 w-16 rounded bg-muted" />
    </div>
  );
}

function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={`animate-pulse rounded-lg border border-border bg-card p-4 ${height}`}>
      <div className="h-3 w-32 rounded bg-muted" />
      <div className="mt-4 h-full rounded bg-muted/30" />
    </div>
  );
}

export default function WeeklyReportPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);

  const [currentMonday, setCurrentMonday] = useState(() =>
    getMondayOfWeek(new Date())
  );

  const dateParam = toDateString(currentMonday);
  const weekNumber = getISOWeek(currentMonday);

  const { data, isLoading } = useWeeklyReport(athleteId, dateParam);

  const [selectedSport, setSelectedSport] = useState<string | null>(null);

  function navigateWeek(offset: number) {
    setCurrentMonday((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + offset * 7);
      return next;
    });
    setSelectedSport(null);
  }

  const isCurrentWeek = useMemo(() => {
    const now = getMondayOfWeek(new Date());
    return currentMonday.getTime() === now.getTime();
  }, [currentMonday]);

  if (!athleteId) {
    return (
      <div data-testid="weekly-report-page" className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            Vaelg en atlet for at se ugerapporten.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="weekly-report-page" className="space-y-6 p-4 md:p-6">
      {/* Header + week navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Ugerapport</h1>

        <div
          data-testid="week-navigation"
          className="flex items-center gap-2"
        >
          <button
            data-testid="week-prev"
            onClick={() => navigateWeek(-1)}
            className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[80px] text-center text-sm font-semibold text-foreground">
            Uge {weekNumber}
          </span>
          <button
            data-testid="week-next"
            onClick={() => navigateWeek(1)}
            disabled={isCurrentWeek}
            className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Top stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total TSS"
            value={formatNumber(Math.round(data.totalTss))}
          />
          <StatCard
            label="Timer"
            value={formatDuration(data.totalDurationSeconds)}
          />
          <StatCard
            label="Sessioner"
            value={data.totalSessions}
          />
          <StatCard
            label="Compliance"
            value={`${Math.round(data.compliancePct)}%`}
          />
          <StatCard
            label="CTL udvikling"
            value={data.ctlDelta >= 0 ? `+${data.ctlDelta.toFixed(1)}` : data.ctlDelta.toFixed(1)}
            trend={data.ctlDelta}
          />
        </div>
      ) : null}

      {/* 2-column: Discipline Balance + Zone Chart */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-2">
          <DisciplineBalance
            disciplines={data.disciplines}
            selectedSport={selectedSport}
            onSelectSport={setSelectedSport}
          />
          <WeeklyZoneChart
            zones={data.zones}
            disciplines={data.disciplines}
            totalDurationSeconds={data.totalDurationSeconds}
            selectedSport={selectedSport}
          />
        </div>
      ) : null}

      {/* Session list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-border/50 bg-card p-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="h-3 w-32 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : data ? (
        <WeeklySessionList sessions={data.sessions} />
      ) : null}
    </div>
  );
}
