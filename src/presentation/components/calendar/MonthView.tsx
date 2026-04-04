import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
  getYear,
} from "date-fns";
import { da } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { formatDuration } from "@/domain/utils/formatters";
import type { Session } from "@/domain/types/training.types";
import type { CalendarEntry } from "@/application/hooks/planning/useCalendar";

// ── Danish month names ─────────────────────────────────────────────────
const MONTH_NAMES = [
  "Januar", "Februar", "Marts", "April", "Maj", "Juni",
  "Juli", "August", "September", "Oktober", "November", "December",
];

const DAY_HEADERS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

function tssBadgeColor(tss: number | null): string {
  if (tss === null) return "bg-gray-100 text-gray-500";
  if (tss < 70) return "bg-green-100 text-green-700";
  if (tss <= 100) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

interface MonthViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  entries: CalendarEntry[];
  sportFilter: string | null;
  isLoading: boolean;
  onDayClick?: (date: Date) => void;
}

export default function MonthView({
  currentDate,
  onDateChange,
  entries,
  sportFilter,
  isLoading,
  onDayClick,
}: MonthViewProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);

  const month = currentDate.getMonth();
  const year = getYear(currentDate);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Build grid of days (up to 6 weeks)
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [calendarStart.toISOString(), calendarEnd.toISOString()]);

  // Group entries by day
  const entriesByDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    const filtered = sportFilter
      ? entries.filter((e) => {
          const sport = e.type === "completed" ? e.data.sport : e.data.sport;
          return sport === sportFilter;
        })
      : entries;

    for (const entry of filtered) {
      const dateStr =
        entry.type === "completed"
          ? format(parseISO(entry.data.startedAt), "yyyy-MM-dd")
          : format(parseISO(entry.data.scheduledDate), "yyyy-MM-dd");
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(entry);
    }
    return map;
  }, [entries, sportFilter]);

  // Month summary
  const monthSummary = useMemo(() => {
    const completed = entries.filter((e) => e.type === "completed") as Array<{
      type: "completed";
      data: Session;
    }>;
    const filtered = sportFilter
      ? completed.filter((e) => e.data.sport === sportFilter)
      : completed;

    let totalTss = 0;
    let totalDuration = 0;
    const sportBreakdown: Record<string, { tss: number; duration: number; count: number }> = {};

    for (const e of filtered) {
      const s = e.data;
      totalTss += s.tss ?? 0;
      totalDuration += s.durationSeconds;
      if (!sportBreakdown[s.sport]) {
        sportBreakdown[s.sport] = { tss: 0, duration: 0, count: 0 };
      }
      sportBreakdown[s.sport].tss += s.tss ?? 0;
      sportBreakdown[s.sport].duration += s.durationSeconds;
      sportBreakdown[s.sport].count += 1;
    }

    return { totalTss, totalDuration, sportBreakdown, sessionCount: filtered.length };
  }, [entries, sportFilter]);

  const handlePrev = () => onDateChange(subMonths(currentDate, 1));
  const handleNext = () => onDateChange(addMonths(currentDate, 1));

  if (isLoading) {
    return (
      <div data-testid="calendar-month-view" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="calendar-month-view" className="space-y-4">
      {/* Month summary header */}
      <div
        data-testid="month-summary"
        className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
      >
        <div className="text-sm">
          <span className="text-gray-500">Sessioner:</span>{" "}
          <span className="font-semibold">{monthSummary.sessionCount}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Timer:</span>{" "}
          <span className="font-semibold">{formatDuration(monthSummary.totalDuration)}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">TSS:</span>{" "}
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${tssBadgeColor(
              monthSummary.totalTss
            )}`}
          >
            {Math.round(monthSummary.totalTss)}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {Object.entries(monthSummary.sportBreakdown).map(([sport, data]) => (
            <div key={sport} className="flex items-center gap-1 text-xs text-gray-600">
              <SportIcon sport={sport} size={14} />
              <span className="font-medium">{data.count}x</span>
              <span className="text-gray-400">{Math.round(data.tss)} TSS</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          data-testid="month-prev"
          onClick={handlePrev}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <ChevronLeft size={16} />
          Forrige
        </button>
        <h2 data-testid="month-title" className="text-lg font-semibold text-gray-900">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          data-testid="month-next"
          onClick={handleNext}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Næste
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_HEADERS.map((name) => (
          <div
            key={name}
            className="py-1 text-center text-xs font-semibold uppercase tracking-wider text-gray-500"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEntries = entriesByDay.get(key) ?? [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={key}
              data-testid={`month-day-${key}`}
              onClick={() => onDayClick?.(day)}
              className={`min-h-[80px] cursor-pointer rounded-lg border p-1.5 transition-colors hover:bg-gray-50 ${
                isToday
                  ? "border-blue-400 bg-blue-50/30"
                  : isCurrentMonth
                  ? "border-gray-100 bg-white"
                  : "border-gray-50 bg-gray-50/50"
              }`}
            >
              <div
                className={`text-right text-xs font-medium ${
                  isToday
                    ? "text-blue-600"
                    : isCurrentMonth
                    ? "text-gray-900"
                    : "text-gray-300"
                }`}
              >
                {format(day, "d")}
              </div>

              {/* Session dots */}
              <div className="mt-1 flex flex-wrap gap-0.5">
                {dayEntries.map((entry) => {
                  const sport =
                    entry.type === "completed" ? entry.data.sport : entry.data.sport;
                  const color = getSportColor(sport);
                  const isPlanned = entry.type === "planned";
                  const id =
                    entry.type === "completed"
                      ? `c-${entry.data.id}`
                      : `p-${entry.data.id}`;

                  return (
                    <span
                      key={id}
                      data-testid={`month-dot-${id}`}
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        isPlanned ? "opacity-50 ring-1 ring-current" : ""
                      }`}
                      style={{
                        backgroundColor: color,
                        borderStyle: isPlanned ? "dashed" : undefined,
                      }}
                      title={
                        entry.type === "completed"
                          ? entry.data.title
                          : `[Planlagt] ${entry.data.title}`
                      }
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
