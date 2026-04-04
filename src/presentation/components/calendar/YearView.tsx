import { useMemo } from "react";
import {
  startOfYear,
  endOfYear,
  startOfMonth,
  endOfMonth,
  addMonths,
  addYears,
  subYears,
  eachDayOfInterval,
  format,
  parseISO,
  getYear,
  getDaysInMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { formatDuration } from "@/domain/utils/formatters";
import type { Session } from "@/domain/types/training.types";
import type { CalendarEntry } from "@/application/hooks/planning/useCalendar";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Maj", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dec",
];

function tssBadgeColor(tss: number | null): string {
  if (tss === null) return "bg-gray-100 text-gray-500";
  if (tss < 70) return "bg-green-100 text-green-700";
  if (tss <= 100) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

interface YearViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  entries: CalendarEntry[];
  sportFilter: string | null;
  isLoading: boolean;
  onMonthClick: (date: Date) => void;
}

export default function YearView({
  currentDate,
  onDateChange,
  entries,
  sportFilter,
  isLoading,
  onMonthClick,
}: YearViewProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);

  const year = getYear(currentDate);

  // Group entries by day for quick lookup
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

  // Year summary
  const yearSummary = useMemo(() => {
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

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(year, i, 1);
      const daysInMonth = getDaysInMonth(monthDate);
      const days = eachDayOfInterval({
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate),
      });
      return { monthIndex: i, date: monthDate, daysInMonth, days };
    });
  }, [year]);

  const handlePrev = () => onDateChange(subYears(currentDate, 1));
  const handleNext = () => onDateChange(addYears(currentDate, 1));

  if (isLoading) {
    return (
      <div data-testid="calendar-year-view" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="calendar-year-view" className="space-y-4">
      {/* Year summary header */}
      <div
        data-testid="year-summary"
        className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
      >
        <div className="text-sm">
          <span className="text-gray-500">Sessioner:</span>{" "}
          <span className="font-semibold">{yearSummary.sessionCount}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Timer:</span>{" "}
          <span className="font-semibold">{formatDuration(yearSummary.totalDuration)}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">TSS:</span>{" "}
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${tssBadgeColor(
              yearSummary.totalTss
            )}`}
          >
            {Math.round(yearSummary.totalTss)}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {Object.entries(yearSummary.sportBreakdown).map(([sport, data]) => (
            <div key={sport} className="flex items-center gap-1 text-xs text-gray-600">
              <SportIcon sport={sport} size={14} />
              <span className="font-medium">{data.count}x</span>
              <span className="text-gray-400">{formatDuration(data.duration)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          data-testid="year-prev"
          onClick={handlePrev}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <ChevronLeft size={16} />
          Forrige
        </button>
        <h2 data-testid="year-title" className="text-lg font-semibold text-gray-900">
          {year}
        </h2>
        <button
          data-testid="year-next"
          onClick={handleNext}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Næste
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 4x3 Month grid */}
      <div className="grid grid-cols-4 gap-4">
        {months.map(({ monthIndex, date, days }) => {
          // Compute per-month stats
          let monthTss = 0;
          let monthSessions = 0;
          for (const day of days) {
            const key = format(day, "yyyy-MM-dd");
            const dayEntries = entriesByDay.get(key) ?? [];
            for (const e of dayEntries) {
              if (e.type === "completed") {
                monthTss += (e.data as Session).tss ?? 0;
                monthSessions++;
              }
            }
          }

          return (
            <div
              key={monthIndex}
              data-testid={`year-month-${monthIndex}`}
              onClick={() => onMonthClick(date)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md"
            >
              {/* Month header */}
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-gray-900">
                  {MONTH_NAMES[monthIndex]}
                </span>
                <span className="text-[10px] text-gray-400">
                  {monthSessions > 0 && (
                    <>
                      {monthSessions}x &middot;{" "}
                      <span
                        className={`inline rounded-full px-1 ${tssBadgeColor(monthTss)}`}
                      >
                        {Math.round(monthTss)}
                      </span>
                    </>
                  )}
                </span>
              </div>

              {/* Mini stacked bar chart — one column per day */}
              <div className="flex gap-px" style={{ height: 40 }}>
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayEntries = entriesByDay.get(key) ?? [];

                  if (dayEntries.length === 0) {
                    return (
                      <div
                        key={key}
                        className="flex-1 rounded-sm bg-gray-100"
                        title={format(day, "d. MMM")}
                      />
                    );
                  }

                  // Stacked segments by sport
                  const segments: { sport: string; fraction: number }[] = [];
                  const total = dayEntries.length;
                  for (const e of dayEntries) {
                    const sport = e.type === "completed" ? e.data.sport : e.data.sport;
                    segments.push({ sport, fraction: 1 / total });
                  }

                  return (
                    <div
                      key={key}
                      className="flex flex-1 flex-col overflow-hidden rounded-sm"
                      title={`${format(day, "d. MMM")} — ${dayEntries.length} sessioner`}
                    >
                      {segments.map((seg, si) => (
                        <div
                          key={si}
                          className="w-full"
                          style={{
                            flex: seg.fraction,
                            backgroundColor: getSportColor(seg.sport),
                            opacity: dayEntries[si]?.type === "planned" ? 0.4 : 1,
                          }}
                        />
                      ))}
                    </div>
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
