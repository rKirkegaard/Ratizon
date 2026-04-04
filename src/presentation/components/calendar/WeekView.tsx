import { useMemo } from "react";
import {
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  getISOWeek,
  getYear,
  isSameDay,
  parseISO,
  addWeeks,
  subWeeks,
} from "date-fns";
import { da } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Trash2 } from "lucide-react";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { formatDuration, formatDistance } from "@/domain/utils/formatters";
import type { Session, PlannedSession } from "@/domain/types/training.types";
import type { CalendarEntry } from "@/application/hooks/planning/useCalendar";

// ── Danish day names ───────────────────────────────────────────────────
const DAY_NAMES = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

// ── TSS badge color helper ─────────────────────────────────────────────
function tssBadgeColor(tss: number | null): string {
  if (tss === null) return "bg-gray-100 text-gray-500";
  if (tss < 70) return "bg-green-100 text-green-700";
  if (tss <= 100) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

// ── Props ──────────────────────────────────────────────────────────────

interface WeekViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  entries: CalendarEntry[];
  sportFilter: string | null;
  isLoading: boolean;
  onDeletePlanned?: (id: string) => void;
  onMovePlanned?: (id: string, newDate: string) => void;
}

export default function WeekView({
  currentDate,
  onDateChange,
  entries,
  sportFilter,
  isLoading,
  onDeletePlanned,
}: WeekViewProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const getActiveSports = useAthleteStore((s) => s.getActiveSports);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekNumber = getISOWeek(currentDate);
  const year = getYear(currentDate);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart.toISOString()]);

  // Group entries by day
  const entriesByDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const day of days) {
      const key = format(day, "yyyy-MM-dd");
      map.set(key, []);
    }
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
      const existing = map.get(dateStr);
      if (existing) {
        existing.push(entry);
      }
    }
    return map;
  }, [entries, days, sportFilter]);

  // Week summary
  const weekSummary = useMemo(() => {
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

  const handlePrev = () => onDateChange(subWeeks(currentDate, 1));
  const handleNext = () => onDateChange(addWeeks(currentDate, 1));

  if (isLoading) {
    return (
      <div data-testid="calendar-week-view" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="grid grid-cols-8 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="calendar-week-view" className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          data-testid="week-prev"
          onClick={handlePrev}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <ChevronLeft size={16} />
          Forrige
        </button>
        <h2 data-testid="week-title" className="text-lg font-semibold text-gray-900">
          Uge {weekNumber}, {year}
        </h2>
        <button
          data-testid="week-next"
          onClick={handleNext}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Næste
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Week grid: 7 days + summary */}
      <div className="grid grid-cols-8 gap-2">
        {days.map((day, idx) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEntries = entriesByDay.get(key) ?? [];
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={key}
              data-testid={`week-day-${key}`}
              className={`min-h-[200px] rounded-lg border p-2 ${
                isToday ? "border-blue-400 bg-blue-50/30" : "border-gray-200 bg-white"
              }`}
            >
              {/* Day header */}
              <div className="mb-2 text-center">
                <div className="text-xs font-medium text-gray-500">{DAY_NAMES[idx]}</div>
                <div
                  className={`text-sm font-semibold ${
                    isToday ? "text-blue-600" : "text-gray-900"
                  }`}
                >
                  {format(day, "d. MMM", { locale: da })}
                </div>
              </div>

              {/* Sessions */}
              <div className="space-y-1.5">
                {dayEntries.map((entry) => {
                  if (entry.type === "completed") {
                    const s = entry.data as Session;
                    const sportColor = getSportColor(s.sport);
                    return (
                      <div
                        key={`c-${s.id}`}
                        data-testid={`session-completed-${s.id}`}
                        className="rounded border-l-[3px] bg-white px-2 py-1.5 shadow-sm"
                        style={{ borderLeftColor: sportColor }}
                      >
                        <div className="flex items-center gap-1">
                          <SportIcon sport={s.sport} size={14} />
                          <span className="truncate text-xs font-medium text-gray-900">
                            {s.title}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-gray-500">
                          <span className="flex items-center gap-0.5">
                            <Clock size={10} />
                            {formatDuration(s.durationSeconds)}
                          </span>
                          {s.distanceMeters && (
                            <span>{formatDistance(s.distanceMeters)}</span>
                          )}
                          {s.tss !== null && (
                            <span
                              className={`inline-flex rounded-full px-1.5 py-0 text-[10px] font-medium ${tssBadgeColor(
                                s.tss
                              )}`}
                            >
                              TSS {Math.round(s.tss)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    const p = entry.data as PlannedSession;
                    const sportColor = getSportColor(p.sport);
                    return (
                      <div
                        key={`p-${p.id}`}
                        data-testid={`session-planned-${p.id}`}
                        className="group relative rounded border-l-[3px] border-dashed bg-white/60 px-2 py-1.5 opacity-75"
                        style={{ borderLeftColor: sportColor }}
                      >
                        <div className="flex items-center gap-1">
                          <SportIcon sport={p.sport} size={14} />
                          <span className="truncate text-xs font-medium text-gray-700">
                            {p.title}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-gray-400">
                          {p.targetDurationSeconds && (
                            <span className="flex items-center gap-0.5">
                              <Clock size={10} />
                              {formatDuration(p.targetDurationSeconds)}
                            </span>
                          )}
                          {p.targetTss !== null && (
                            <span
                              className={`inline-flex rounded-full px-1.5 py-0 text-[10px] font-medium ${tssBadgeColor(
                                p.targetTss
                              )}`}
                            >
                              Mål TSS {Math.round(p.targetTss)}
                            </span>
                          )}
                        </div>
                        {onDeletePlanned && (
                          <button
                            data-testid={`delete-planned-${p.id}`}
                            onClick={() => onDeletePlanned(p.id)}
                            className="absolute right-1 top-1 hidden rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500 group-hover:block"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  }
                })}
                {dayEntries.length === 0 && (
                  <div className="py-4 text-center text-[10px] text-gray-300">
                    Ingen sessioner
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Week summary column */}
        <div
          data-testid="week-summary"
          className="min-h-[200px] rounded-lg border border-gray-200 bg-gray-50 p-3"
        >
          <div className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
            Ugeoversigt
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-gray-400">Sessioner</div>
              <div className="text-lg font-bold text-gray-900">{weekSummary.sessionCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400">Total tid</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatDuration(weekSummary.totalDuration)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400">Total TSS</div>
              <div
                className={`inline-flex rounded-full px-2 py-0.5 text-sm font-bold ${tssBadgeColor(
                  weekSummary.totalTss
                )}`}
              >
                {Math.round(weekSummary.totalTss)}
              </div>
            </div>

            {/* Per-sport breakdown */}
            <div className="border-t border-gray-200 pt-2">
              <div className="text-[10px] text-gray-400 mb-1.5">Per sport</div>
              <div className="space-y-1.5">
                {Object.entries(weekSummary.sportBreakdown).map(([sport, data]) => (
                  <div key={sport} className="flex items-center gap-1.5">
                    <SportIcon sport={sport} size={12} />
                    <div className="flex-1 text-[11px]">
                      <span className="font-medium text-gray-700">{data.count}x</span>
                      <span className="ml-1 text-gray-400">
                        {formatDuration(data.duration)}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {Math.round(data.tss)} TSS
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
