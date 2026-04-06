import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
  getYear,
  getISOWeek,
} from "date-fns";
import { da } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { formatDuration, formatDistance } from "@/domain/utils/formatters";
import { getPhaseForDate } from "@/domain/utils/phase-colors";
import type { Session, PlannedSession } from "@/domain/types/training.types";
import type { SessionBrick } from "@/domain/types/brick.types";
import type {
  CalendarEntry,
  CalendarPhase,
  CalendarGoal,
} from "@/application/hooks/planning/useCalendar";

const MONTH_NAMES = [
  "Januar", "Februar", "Marts", "April", "Maj", "Juni",
  "Juli", "August", "September", "Oktober", "November", "December",
];
const DAY_HEADERS = ["Man", "Tir", "Ons", "Tor", "Fre", "Loer", "Soen"];

interface MonthViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  entries: CalendarEntry[];
  sportFilter: string | null;
  isLoading: boolean;
  onDayClick?: (date: Date) => void;
  phases: CalendarPhase[];
  goals: CalendarGoal[];
}

export default function MonthView({
  currentDate,
  onDateChange,
  entries,
  sportFilter,
  isLoading,
  onDayClick,
  phases,
  goals,
}: MonthViewProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const year = getYear(currentDate);
  const monthIdx = currentDate.getMonth();

  // Build weeks
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let day = calStart;
    for (let w = 0; w < 6; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(day);
        day = addDays(day, 1);
      }
      if (week.some((d) => isSameMonth(d, monthStart))) result.push(week);
    }
    return result;
  }, [calStart.toISOString(), monthStart.toISOString()]);

  // Group entries by day
  const entriesByDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    const filtered = sportFilter
      ? entries.filter((e) => e.type === "brick" || e.data.sport === sportFilter)
      : entries;
    for (const entry of filtered) {
      let dateStr: string;
      if (entry.type === "completed") dateStr = format(parseISO(entry.data.startedAt), "yyyy-MM-dd");
      else if (entry.type === "planned") dateStr = format(parseISO(entry.data.scheduledDate), "yyyy-MM-dd");
      else dateStr = (entry.data as SessionBrick).startedAt.split("T")[0];
      const arr = map.get(dateStr) || [];
      arr.push(entry);
      map.set(dateStr, arr);
    }
    return map;
  }, [entries, sportFilter]);

  // Goals by date
  const goalsByDay = useMemo(() => {
    const m = new Map<string, CalendarGoal[]>();
    for (const g of goals) {
      if (!g.targetDate) continue;
      const key = g.targetDate.split("T")[0];
      const arr = m.get(key) || [];
      arr.push(g);
      m.set(key, arr);
    }
    return m;
  }, [goals]);

  // Weekly summaries
  const weekSummaries = useMemo(() => {
    const map = new Map<number, { tss: number; duration: number; count: number; bySport: Record<string, { count: number; duration: number }> }>();
    for (const entry of entries) {
      if (entry.type !== "completed") continue;
      const s = entry.data as Session;
      const wn = getISOWeek(parseISO(s.startedAt));
      if (!map.has(wn)) map.set(wn, { tss: 0, duration: 0, count: 0, bySport: {} });
      const ws = map.get(wn)!;
      ws.tss += s.tss ?? 0;
      ws.duration += s.durationSeconds;
      ws.count += 1;
      if (!ws.bySport[s.sport]) ws.bySport[s.sport] = { count: 0, duration: 0 };
      ws.bySport[s.sport].count += 1;
      ws.bySport[s.sport].duration += s.durationSeconds;
    }
    return map;
  }, [entries]);

  // Month summary header
  const monthSummary = useMemo(() => {
    let totalDuration = 0;
    let totalTss = 0;
    let totalCount = 0;
    const bySport: Record<string, { duration: number; distance: number; count: number }> = {};

    for (const entry of entries) {
      if (entry.type !== "completed") continue;
      const s = entry.data as Session;
      if (!isSameMonth(parseISO(s.startedAt), monthStart)) continue;
      totalDuration += s.durationSeconds;
      totalTss += s.tss ?? 0;
      totalCount += 1;
      if (!bySport[s.sport]) bySport[s.sport] = { duration: 0, distance: 0, count: 0 };
      bySport[s.sport].duration += s.durationSeconds;
      bySport[s.sport].distance += s.distanceMeters ?? 0;
      bySport[s.sport].count += 1;
    }
    return { totalDuration, totalTss, totalCount, bySport };
  }, [entries, monthStart]);

  if (isLoading) {
    return <div data-testid="calendar-month-view" className="h-96 animate-pulse rounded-lg bg-muted/50" />;
  }

  return (
    <div data-testid="calendar-month-view" className="space-y-3">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => onDateChange(subMonths(currentDate, 1))} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          <ChevronLeft size={16} /> Forrige
        </button>
        <h2 className="text-lg font-semibold text-foreground">{MONTH_NAMES[monthIdx]} {year}</h2>
        <button onClick={() => onDateChange(addMonths(currentDate, 1))} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          Naeste <ChevronRight size={16} />
        </button>
      </div>

      {/* Month summary header */}
      {monthSummary.totalCount > 0 && (
        <div data-testid="month-summary" className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card px-4 py-2 text-sm">
          <span className="font-medium text-foreground">
            {monthSummary.totalCount} sessioner
          </span>
          <span className="text-muted-foreground">
            <Clock size={12} className="mr-1 inline" />
            {formatDuration(monthSummary.totalDuration)}
          </span>
          <span className="text-muted-foreground">{Math.round(monthSummary.totalTss)} TSS</span>
          <span className="mx-1 text-border">|</span>
          {Object.entries(monthSummary.bySport).map(([sport, data]) => (
            <span key={sport} className="flex items-center gap-1 text-xs text-muted-foreground">
              <SportIcon sport={sport} size={12} />
              {formatDuration(data.duration)}
              {data.distance > 0 && <span>· {formatDistance(data.distance)}</span>}
            </span>
          ))}
        </div>
      )}

      {/* Calendar grid: week# + 7 days + weekly summary */}
      <div className="grid grid-cols-[36px_repeat(7,1fr)_140px] gap-px rounded-lg border border-border overflow-hidden bg-border">
        {/* Header row */}
        <div className="bg-muted/50 p-1 text-center text-[9px] font-medium text-muted-foreground">Uge</div>
        {DAY_HEADERS.map((d) => (
          <div key={d} className="bg-muted/50 p-1 text-center text-[10px] font-medium text-muted-foreground">{d}</div>
        ))}
        <div className="bg-muted/50 p-1 text-center text-[9px] font-medium text-muted-foreground">Oversigt</div>

        {/* Week rows */}
        {weeks.map((week, wi) => {
          const wn = getISOWeek(week[3] || week[0]);
          const ws = weekSummaries.get(wn);
          const phase = getPhaseForDate(format(week[0], "yyyy-MM-dd"), phases);

          return (
            <div key={wi} className="contents">
              {/* Week number */}
              <div className="flex flex-col items-center justify-start bg-card p-1 pt-2">
                <span className="text-[10px] font-bold text-muted-foreground">{wn}</span>
                {phase && <div className="mt-1 h-1 w-full rounded-full" style={{ backgroundColor: phase.color }} />}
              </div>

              {/* Day cells */}
              {week.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                const dayEntries = entriesByDay.get(key) ?? [];
                const dayGoals = goalsByDay.get(key) ?? [];
                const MAX_VISIBLE = 2;

                return (
                  <div
                    key={key}
                    data-testid={`month-day-${key}`}
                    onClick={() => onDayClick?.(day)}
                    className={`min-h-[90px] cursor-pointer p-1 transition-colors hover:bg-muted/20 ${
                      inMonth ? "bg-card" : "bg-muted/10"
                    } ${isToday ? "ring-1 ring-primary ring-inset" : ""}`}
                  >
                    {/* Date + goal */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${isToday ? "font-bold text-primary" : inMonth ? "text-foreground" : "text-muted-foreground/30"}`}>
                        {format(day, "d")}
                      </span>
                      {dayGoals.length > 0 && (
                        <MapPin size={10} style={{ color: dayGoals[0].racePriority === "A" ? "#EF4444" : "#EAB308" }} />
                      )}
                    </div>

                    {/* Session bars */}
                    <div className="mt-0.5 space-y-0.5">
                      {dayEntries.slice(0, MAX_VISIBLE).map((entry, idx) => {
                        if (entry.type === "brick") {
                          const b = entry.data as SessionBrick;
                          return (
                            <div key={`b-${b.id}`} className="flex items-center gap-0.5 rounded bg-amber-500/10 px-1 py-0.5 text-[9px]">
                              {b.segments.map((seg) => <SportIcon key={seg.id} sport={seg.sport} size={9} />)}
                              <span className="text-muted-foreground">{formatDuration(b.totalDurationSeconds)}</span>
                            </div>
                          );
                        }

                        const isCompleted = entry.type === "completed";
                        const sport = entry.data.sport;
                        const color = getSportColor(sport);
                        const duration = isCompleted
                          ? (entry.data as Session).durationSeconds
                          : (entry.data as PlannedSession).targetDurationSeconds ?? 0;
                        const distance = isCompleted ? (entry.data as Session).distanceMeters : null;
                        const tss = isCompleted ? (entry.data as Session).tss : (entry.data as PlannedSession).targetTss;

                        return (
                          <div
                            key={`${entry.type[0]}-${entry.data.id}`}
                            className={`flex items-center gap-0.5 rounded border-l-2 px-1 py-0.5 text-[9px] ${
                              isCompleted ? "bg-card" : "bg-muted/20 opacity-50"
                            }`}
                            style={{ borderLeftColor: color }}
                          >
                            <SportIcon sport={sport} size={9} />
                            <span className="text-muted-foreground">
                              {formatDuration(duration)}
                            </span>
                            {distance != null && distance > 0 && (
                              <span className="text-muted-foreground/60">{formatDistance(distance)}</span>
                            )}
                            {tss != null && (
                              <span className="ml-auto font-medium text-muted-foreground">{Math.round(tss)}</span>
                            )}
                          </div>
                        );
                      })}
                      {dayEntries.length > MAX_VISIBLE && (
                        <div className="text-center text-[8px] text-muted-foreground/50">
                          +{dayEntries.length - MAX_VISIBLE} flere
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Weekly summary */}
              <div className="bg-muted/10 p-1.5 text-[10px]">
                {ws ? (
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">
                      {formatDuration(ws.duration)}
                    </div>
                    <div className="text-muted-foreground">{Math.round(ws.tss)} TSS</div>
                    <div className="space-y-0.5">
                      {Object.entries(ws.bySport).map(([sport, data]) => (
                        <div key={sport} className="flex items-center gap-1">
                          <SportIcon sport={sport} size={9} />
                          <span className="text-muted-foreground">{data.count}x</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-muted-foreground/60">{ws.count} traen.</div>
                  </div>
                ) : (
                  <span className="text-muted-foreground/30">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
