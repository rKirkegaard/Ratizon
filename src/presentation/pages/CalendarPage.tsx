import { useState, useMemo, useCallback } from "react";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
} from "date-fns";
import { Calendar, Filter } from "lucide-react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import {
  useCalendarSessions,
  useMoveSession,
  useDeleteSession,
} from "@/application/hooks/planning/useCalendar";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import WeekView from "@/presentation/components/calendar/WeekView";
import MonthView from "@/presentation/components/calendar/MonthView";
import YearView from "@/presentation/components/calendar/YearView";

type ViewMode = "week" | "month" | "year";

function getDateRange(date: Date, mode: ViewMode): { start: string; end: string } {
  switch (mode) {
    case "week": {
      const s = startOfWeek(date, { weekStartsOn: 1 });
      const e = endOfWeek(date, { weekStartsOn: 1 });
      return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
    }
    case "month": {
      // Fetch extra days for calendar grid (prev/next month partial weeks)
      const ms = startOfMonth(date);
      const me = endOfMonth(date);
      const s = startOfWeek(ms, { weekStartsOn: 1 });
      const e = endOfWeek(me, { weekStartsOn: 1 });
      return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
    }
    case "year": {
      const s = startOfYear(date);
      const e = endOfYear(date);
      return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
    }
  }
}

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sportFilter, setSportFilter] = useState<string | null>(null);

  const selectedAthleteId = useAthleteStore((s) => s.selectedAthleteId);
  const getActiveSports = useAthleteStore((s) => s.getActiveSports);
  const activeSports = getActiveSports();

  const { start, end } = useMemo(
    () => getDateRange(currentDate, viewMode),
    [currentDate, viewMode]
  );

  const { all, isLoading, isError, error } = useCalendarSessions(
    selectedAthleteId,
    start,
    end
  );

  const moveMutation = useMoveSession(selectedAthleteId);
  const deleteMutation = useDeleteSession(selectedAthleteId);

  const handleDeletePlanned = useCallback(
    (id: string) => {
      if (window.confirm("Slet denne planlagte session?")) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation]
  );

  const handleMovePlanned = useCallback(
    (id: string, newDate: string) => {
      moveMutation.mutate({ sessionId: id, newDate });
    },
    [moveMutation]
  );

  const handleMonthClick = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      setViewMode("month");
    },
    []
  );

  const handleDayClick = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      setViewMode("week");
    },
    []
  );

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const VIEW_LABELS: Record<ViewMode, string> = {
    week: "Uge",
    month: "Måned",
    year: "År",
  };

  return (
    <div data-testid="calendar-page" className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Today button */}
          <button
            data-testid="calendar-today"
            onClick={handleToday}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            I dag
          </button>

          {/* View mode toggle */}
          <div
            data-testid="view-mode-toggle"
            className="inline-flex rounded-lg border border-gray-300 bg-white"
          >
            {(["week", "month", "year"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                data-testid={`view-mode-${mode}`}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  viewMode === mode
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {VIEW_LABELS[mode]}
              </button>
            ))}
          </div>

          {/* Sport filter */}
          <div data-testid="sport-filter" className="relative flex items-center gap-1">
            <Filter size={14} className="text-gray-400" />
            <select
              data-testid="sport-filter-select"
              value={sportFilter ?? "all"}
              onChange={(e) =>
                setSportFilter(e.target.value === "all" ? null : e.target.value)
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 pr-8 text-sm text-gray-700"
            >
              <option value="all">Alle sportsgrene</option>
              {activeSports.map((s) => (
                <option key={s.sport_key} value={s.sport_key}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div
          data-testid="calendar-error"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          Kunne ikke hente kalenderdata: {(error as Error)?.message ?? "Ukendt fejl"}
        </div>
      )}

      {/* No athlete selected */}
      {!selectedAthleteId && (
        <div
          data-testid="calendar-no-athlete"
          className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500"
        >
          Vælg en atlet for at se kalenderen.
        </div>
      )}

      {/* Views */}
      {selectedAthleteId && viewMode === "week" && (
        <WeekView
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          entries={all}
          sportFilter={sportFilter}
          isLoading={isLoading}
          onDeletePlanned={handleDeletePlanned}
          onMovePlanned={handleMovePlanned}
        />
      )}

      {selectedAthleteId && viewMode === "month" && (
        <MonthView
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          entries={all}
          sportFilter={sportFilter}
          isLoading={isLoading}
          onDayClick={handleDayClick}
        />
      )}

      {selectedAthleteId && viewMode === "year" && (
        <YearView
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          entries={all}
          sportFilter={sportFilter}
          isLoading={isLoading}
          onMonthClick={handleMonthClick}
        />
      )}
    </div>
  );
}
