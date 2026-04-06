import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
  getYear,
} from "date-fns";
import { ChevronLeft, ChevronRight, CheckCircle2, Zap, Target } from "lucide-react";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { formatDuration, formatDistance } from "@/domain/utils/formatters";
import type { Session, PlannedSession } from "@/domain/types/training.types";
import type {
  CalendarEntry,
  CalendarPhase,
  CalendarGoal,
} from "@/application/hooks/planning/useCalendar";

const MONTH_NAMES = [
  "Januar", "Februar", "Marts", "April", "Maj", "Juni",
  "Juli", "August", "September", "Oktober", "November", "December",
];
const WEEKDAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Loer", "Soen"];

function getSessionTypeLabel(t: string): string {
  const map: Record<string, string> = {
    endurance: "Udholdenhed", tempo: "Tempo", sweet_spot: "Sweet Spot",
    threshold: "Taerskel", vo2max: "VO2max", recovery: "Restitution",
    interval: "Interval", race: "Konkurrence", easy: "Let",
  };
  return map[t] || t;
}

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
}: MonthViewProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const year = getYear(currentDate);
  const monthIdx = currentDate.getMonth();

  const weeks = useMemo(() => {
    const allDays = eachDayOfInterval({ start: calStart, end: calEnd });
    const result: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) result.push(allDays.slice(i, i + 7));
    return result;
  }, [calStart.toISOString(), calEnd.toISOString()]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    const filtered = sportFilter
      ? entries.filter((e) => e.type === "brick" || e.data.sport === sportFilter)
      : entries;
    for (const entry of filtered) {
      let dateStr: string;
      if (entry.type === "completed") dateStr = format(parseISO(entry.data.startedAt), "yyyy-MM-dd");
      else if (entry.type === "planned") dateStr = format(parseISO(entry.data.scheduledDate), "yyyy-MM-dd");
      else dateStr = entry.data.startedAt.split("T")[0];
      const arr = map.get(dateStr) || [];
      arr.push(entry);
      map.set(dateStr, arr);
    }
    return map;
  }, [entries, sportFilter]);

  const getWeeklySummary = (weekDays: Date[]) => {
    let totalDuration = 0, totalTss = 0, totalSessions = 0;
    let plannedDuration = 0, plannedTss = 0, plannedSessions = 0;
    const bySport: Record<string, { count: number; duration: number; distance: number; tss: number }> = {};
    const plannedBySport: Record<string, { count: number; duration: number; distance: number; tss: number }> = {};

    for (const day of weekDays) {
      const key = format(day, "yyyy-MM-dd");
      for (const entry of entriesByDay.get(key) ?? []) {
        if (entry.type === "completed") {
          const s = entry.data as Session;
          totalDuration += s.durationSeconds;
          totalTss += s.tss ?? 0;
          totalSessions += 1;
          if (!bySport[s.sport]) bySport[s.sport] = { count: 0, duration: 0, distance: 0, tss: 0 };
          bySport[s.sport].count += 1;
          bySport[s.sport].duration += s.durationSeconds;
          bySport[s.sport].distance += s.distanceMeters ?? 0;
          bySport[s.sport].tss += s.tss ?? 0;
        } else if (entry.type === "planned") {
          const p = entry.data as PlannedSession;
          plannedDuration += p.targetDurationSeconds ?? 0;
          plannedTss += p.targetTss ?? 0;
          plannedSessions += 1;
          if (!plannedBySport[p.sport]) plannedBySport[p.sport] = { count: 0, duration: 0, distance: 0, tss: 0 };
          plannedBySport[p.sport].count += 1;
          plannedBySport[p.sport].duration += p.targetDurationSeconds ?? 0;
          plannedBySport[p.sport].distance += p.targetDistanceMeters ?? 0;
          plannedBySport[p.sport].tss += p.targetTss ?? 0;
        }
      }
    }
    return { totalDuration, totalTss, totalSessions, bySport, plannedDuration, plannedTss, plannedSessions, plannedBySport };
  };

  const monthSummary = useMemo(() => {
    let totalDuration = 0, totalTss = 0, totalSessions = 0;
    const bySport: Record<string, { duration: number; distance: number; count: number }> = {};
    for (const entry of entries) {
      if (entry.type !== "completed") continue;
      const s = entry.data as Session;
      if (!isSameMonth(parseISO(s.startedAt), monthStart)) continue;
      totalDuration += s.durationSeconds;
      totalTss += s.tss ?? 0;
      totalSessions += 1;
      if (!bySport[s.sport]) bySport[s.sport] = { duration: 0, distance: 0, count: 0 };
      bySport[s.sport].duration += s.durationSeconds;
      bySport[s.sport].distance += s.distanceMeters ?? 0;
      bySport[s.sport].count += 1;
    }
    return { totalDuration, totalTss, totalSessions, bySport };
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

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Month summary header */}
        {monthSummary.totalSessions > 0 && (
          <div className="flex items-start justify-between border-b border-border bg-muted/10 p-3">
            <div className="text-sm font-medium text-foreground">Maanedssummering</div>
            <div className="text-xs text-right space-y-0.5">
              <div className="flex items-center justify-end gap-2 font-medium text-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Gennemfoert
                <span className="text-muted-foreground">{formatDuration(monthSummary.totalDuration)}</span>
              </div>
              {monthSummary.totalTss > 0 && (
                <div className="flex items-center justify-end gap-1 text-muted-foreground">
                  <Zap className="h-3 w-3 text-amber-400" />
                  {Math.round(monthSummary.totalTss)} TSS
                </div>
              )}
              {Object.entries(monthSummary.bySport).map(([sport, data]) => (
                <div key={sport} className="flex items-center justify-end gap-1" style={{ color: getSportColor(sport) }}>
                  <SportIcon sport={sport} size={12} />
                  <span>{formatDuration(data.duration)}</span>
                  {data.distance > 0 && <span className="text-muted-foreground">- {formatDistance(data.distance)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekday header */}
        <div className="grid grid-cols-8 gap-0 border-b border-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="p-3 text-center text-sm font-medium text-muted-foreground bg-muted/30">{d}</div>
          ))}
          <div className="p-3 text-center text-sm font-medium text-muted-foreground bg-muted/30">Uge Total</div>
        </div>

        {/* Week rows */}
        {weeks.map((week, wi) => {
          const summary = getWeeklySummary(week);
          const weekNum = format(week[3] || week[0], "w");

          return (
            <div key={wi} className="grid grid-cols-8 gap-0 border-b border-border/50 last:border-b-0">
              {/* Day cells */}
              {week.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                const dayEntries = entriesByDay.get(key) ?? [];

                return (
                  <div
                    key={key}
                    data-testid={`month-day-${key}`}
                    onClick={() => onDayClick?.(day)}
                    className={`min-h-[120px] cursor-pointer border-r border-border/30 p-2 transition-colors hover:bg-muted/20 ${
                      !inMonth ? "bg-muted/5" : ""
                    } ${isToday ? "bg-primary/5" : ""}`}
                  >
                    <div className={`mb-1 text-sm ${isToday ? "font-bold text-primary" : inMonth ? "text-foreground" : "text-muted-foreground/30"}`}>
                      {format(day, "d")}
                    </div>

                    <div className="space-y-1">
                      {dayEntries.map((entry) => {
                        if (entry.type === "completed") {
                          const s = entry.data as Session;
                          return (
                            <div
                              key={`c-${s.id}`}
                              className="rounded border-l-2 border border-border/50 bg-muted/40 px-1.5 py-1 text-xs text-muted-foreground hover:opacity-80"
                              style={{ borderLeftColor: getSportColor(s.sport) }}
                            >
                              <div className="flex items-center gap-1 mb-0.5">
                                <SportIcon sport={s.sport} size={12} />
                                <span className="font-medium text-[10px] uppercase tracking-wide text-foreground">
                                  {getSessionTypeLabel(s.sessionType)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px]">
                                <span>{formatDuration(s.durationSeconds)}</span>
                                {s.distanceMeters != null && s.distanceMeters > 0 && (
                                  <span>{formatDistance(s.distanceMeters)}</span>
                                )}
                                {s.tss != null && (
                                  <span className="flex items-center gap-0.5">
                                    <Zap className="h-2.5 w-2.5" />{Math.round(s.tss)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }
                        if (entry.type === "planned") {
                          const p = entry.data as PlannedSession;
                          return (
                            <div
                              key={`p-${p.id}`}
                              className="rounded border border-dashed border-border/50 bg-muted/20 px-1.5 py-1 text-xs text-muted-foreground/60 opacity-60"
                              style={{ borderLeftColor: getSportColor(p.sport), borderLeftWidth: 2, borderLeftStyle: "solid" }}
                            >
                              <div className="flex items-center gap-1 mb-0.5">
                                <SportIcon sport={p.sport} size={12} />
                                <span className="font-medium text-[10px] italic">{p.title}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px]">
                                {p.targetDurationSeconds && <span>{formatDuration(p.targetDurationSeconds)}</span>}
                                {p.targetTss != null && (
                                  <span className="flex items-center gap-0.5">
                                    <Target className="h-2.5 w-2.5" />{Math.round(p.targetTss)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Uge Total — IronCoach-style with TSS per discipline */}
              <div className="min-h-[120px] bg-muted/10 border-l border-border p-3">
                <div className="text-xs font-semibold text-foreground mb-2">Uge {weekNum}</div>
                {(summary.totalSessions > 0 || summary.plannedSessions > 0) ? (
                  <div className="space-y-2">
                    {summary.totalSessions > 0 && (
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-2 font-medium text-foreground mb-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          Gennemfoert
                          <span className="text-muted-foreground">{formatDuration(summary.totalDuration)}</span>
                        </div>
                        {summary.totalTss > 0 && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Zap className="h-3 w-3 text-amber-400" />
                            {Math.ceil(summary.totalTss)} TSS
                          </div>
                        )}
                        {Object.entries(summary.bySport).map(([sport, data]) => (
                          <div key={sport} className="flex items-center gap-1 pl-2" style={{ color: getSportColor(sport) }}>
                            <SportIcon sport={sport} size={12} />
                            <span>{formatDuration(data.duration)}</span>
                            {data.distance > 0 && (
                              <span className="text-muted-foreground">- {formatDistance(data.distance)}</span>
                            )}
                            <span className="text-muted-foreground ml-auto text-[10px]">{Math.round(data.tss)} TSS</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {summary.plannedSessions > 0 && (
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <div className="flex items-center gap-2 font-medium mb-1">
                          <Target className="h-3 w-3 text-blue-500" />
                          Planlagt
                          <span className="text-muted-foreground">{formatDuration(summary.plannedDuration)}</span>
                        </div>
                        {summary.plannedTss > 0 && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Zap className="h-3 w-3 text-amber-400" />
                            {Math.ceil(summary.plannedTss)} TSS
                          </div>
                        )}
                        {Object.entries(summary.plannedBySport).map(([sport, data]) => (
                          <div key={sport} className="flex items-center gap-1 pl-2" style={{ color: getSportColor(sport) }}>
                            <SportIcon sport={sport} size={12} />
                            <span>{formatDuration(data.duration)}</span>
                            <span className="text-muted-foreground ml-auto text-[10px]">{Math.round(data.tss)} TSS</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground/40">Ingen traeninger</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
