import { useAthleteStore } from "@/application/stores/athleteStore";
import { useDashboard } from "@/application/hooks/useDashboard";
import WellnessQuickLog from "@/presentation/components/dashboard/WellnessQuickLog";
import WellnessStrip from "@/presentation/components/dashboard/WellnessStrip";
import FitnessStatus from "@/presentation/components/dashboard/FitnessStatus";
import TodaysPlan from "@/presentation/components/dashboard/TodaysPlan";
import YesterdaySession from "@/presentation/components/dashboard/YesterdaySession";
import WeekStatus from "@/presentation/components/dashboard/WeekStatus";
import UpcomingSessions from "@/presentation/components/dashboard/UpcomingSessions";
import CoachInbox from "@/presentation/components/dashboard/CoachInbox";
import MotivationStrip from "@/presentation/components/dashboard/MotivationStrip";
import RaceCountdown from "@/presentation/components/planning/RaceCountdown";
import PoolDisruptions from "@/presentation/components/dashboard/PoolDisruptions";
import { UserCircle2 } from "lucide-react";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg border border-border/50 bg-card ${className}`}
    >
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 rounded bg-muted" />
        <div className="h-6 w-1/2 rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div data-testid="dashboard-skeleton" className="space-y-4">
      {/* Quick log skeleton */}
      <SkeletonBlock className="h-14" />
      {/* Wellness strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
      </div>
      {/* 2-column grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonBlock className="h-48" />
        <SkeletonBlock className="h-48" />
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-40" />
      </div>
      {/* Full width */}
      <SkeletonBlock className="h-32" />
      <SkeletonBlock className="h-32" />
      <SkeletonBlock className="h-16" />
    </div>
  );
}

function EmptyState() {
  return (
    <div
      data-testid="dashboard-empty"
      className="flex min-h-[60vh] flex-col items-center justify-center text-center"
    >
      <UserCircle2 size={48} className="mb-4 text-muted-foreground" />
      <h2 className="text-lg font-semibold text-foreground">Vaelg en atlet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Vaelg en atlet i menuen for at se dashboard.
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const {
    data,
    isLoading,
    isError,
    error,
    logWellness,
    isLoggingWellness,
    wellnessLogSuccess,
  } = useDashboard(athleteId);

  if (!athleteId) {
    return (
      <div data-testid="dashboard-page">
        <EmptyState />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div data-testid="dashboard-page">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Dashboard</h1>
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div data-testid="dashboard-page">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Dashboard</h1>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">
            Kunne ikke hente dashboard data. {error?.message}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div data-testid="dashboard-page" className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <PoolDisruptions />

      {/* Goals: Main + Next */}
      <div className={data.next_goal ? "grid gap-4 md:grid-cols-2" : ""}>
        <RaceCountdown goal={data.main_goal as any} isLoading={false} />
        {data.next_goal && <RaceCountdown goal={data.next_goal as any} isLoading={false} />}
      </div>

      {/* Wellness Quick-Log */}
      <WellnessQuickLog
        loggedToday={data.wellness.logged_today}
        onSubmit={logWellness}
        isSubmitting={isLoggingWellness}
        submitSuccess={wellnessLogSuccess}
      />

      {/* Wellness Strip */}
      <WellnessStrip wellness={data.wellness} />

      {/* 2-column: Fitness Status + Dagens Plan */}
      <div className="grid gap-4 md:grid-cols-2">
        <FitnessStatus fitness={data.fitness} />
        <TodaysPlan sessions={data.todays_plan} />
      </div>

      {/* 2-column: Yesterday Session + Week Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <YesterdaySession sessions={data.yesterday_sessions} />
        <WeekStatus weekStatus={data.week_status} />
      </div>

      {/* Upcoming Sessions */}
      <UpcomingSessions sessions={data.upcoming_sessions} />

      {/* Coach Inbox */}
      <CoachInbox alerts={data.alerts} totalAlerts={data.alerts_total} />

      {/* Motivation Strip */}
      <MotivationStrip motivation={data.motivation} />
    </div>
  );
}
