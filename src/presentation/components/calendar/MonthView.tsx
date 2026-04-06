import { useMemo, useState } from "react";
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
import { ChevronLeft, ChevronRight, CheckCircle2, Zap, Target, X, Clock, Heart, TrendingUp } from "lucide-react";
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
  const [selectedSession, setSelectedSession] = useState<Session | PlannedSession | null>(null);
  const [sessionType, setSessionType] = useState<"completed" | "planned">("completed");
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
                              onClick={(e) => { e.stopPropagation(); setSelectedSession(s); setSessionType("completed"); }}
                              className="rounded border-l-2 border border-border/50 bg-muted/40 px-1.5 py-1 text-xs text-muted-foreground hover:opacity-80 cursor-pointer"
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
                              onClick={(e) => { e.stopPropagation(); setSelectedSession(p); setSessionType("planned"); }}
                              className="rounded border border-dashed border-border/50 bg-muted/20 px-1.5 py-1 text-xs text-muted-foreground/60 opacity-60 cursor-pointer"
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

      {/* Session Detail Modal — IronCoach style */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedSession(null)}>
          <div
            className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedSession(null)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>

            {sessionType === "completed" ? (() => {
              const s = selectedSession as Session;
              const sportColor = getSportColor(s.sport);
              return (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ backgroundColor: sportColor }}>
                      <SportIcon sport={s.sport} size={20} />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-foreground">{s.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(s.startedAt), "EEEE d. MMMM yyyy 'kl.' HH:mm", { locale: undefined })}
                      </div>
                    </div>
                  </div>

                  {/* Quick stats grid */}
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    <div className="rounded-lg bg-muted/30 p-3 text-center">
                      <div className="text-2xl font-bold text-foreground">{formatDuration(s.durationSeconds)}</div>
                      <div className="text-xs text-muted-foreground">Varighed</div>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3 text-center">
                      <div className="text-2xl font-bold text-foreground">{s.tss != null ? Math.round(s.tss) : "–"}</div>
                      <div className="text-xs text-muted-foreground">TSS</div>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3 text-center">
                      <div className="text-sm font-bold uppercase text-foreground" style={{ color: sportColor }}>
                        {getSessionTypeLabel(s.sessionType)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Type</div>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3 text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {s.distanceMeters ? formatDistance(s.distanceMeters) : "–"}
                      </div>
                      <div className="text-xs text-muted-foreground">Distance</div>
                    </div>
                  </div>

                  {/* Detailed metrics */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {s.avgHr != null && (
                      <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <div>
                          <div className="text-sm font-semibold text-foreground">{s.avgHr} bpm</div>
                          <div className="text-[10px] text-muted-foreground">Gns. puls{s.maxHr ? ` (max ${s.maxHr})` : ""}</div>
                        </div>
                      </div>
                    )}
                    {s.avgPower != null && (
                      <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <div>
                          <div className="text-sm font-semibold text-foreground">{s.avgPower}W</div>
                          <div className="text-[10px] text-muted-foreground">Gns. effekt{s.normalizedPower ? ` (NP ${s.normalizedPower})` : ""}</div>
                        </div>
                      </div>
                    )}
                    {s.avgPace != null && (
                      <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {Math.floor(s.avgPace / 60)}:{String(Math.round(s.avgPace % 60)).padStart(2, "0")}/km
                          </div>
                          <div className="text-[10px] text-muted-foreground">Gns. pace</div>
                        </div>
                      </div>
                    )}
                    {s.avgCadence != null && (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-semibold text-foreground">{Math.round(s.avgCadence)}</div>
                          <div className="text-[10px] text-muted-foreground">Kadence {s.sport === "bike" ? "rpm" : "spm"}</div>
                        </div>
                      </div>
                    )}
                    {s.elevationGain != null && s.elevationGain > 0 && (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-semibold text-foreground">{Math.round(s.elevationGain)}m</div>
                          <div className="text-[10px] text-muted-foreground">Stigning</div>
                        </div>
                      </div>
                    )}
                    {s.calories != null && (
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-2">
                        <Zap className="h-4 w-4 text-orange-400" />
                        <div>
                          <div className="text-sm font-semibold text-foreground">{Math.round(s.calories)}</div>
                          <div className="text-[10px] text-muted-foreground">Kalorier</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {s.notes && (
                    <div className="rounded-lg border border-border bg-muted/10 p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Noter</div>
                      <p className="text-sm text-foreground">{s.notes}</p>
                    </div>
                  )}
                </>
              );
            })() : (() => {
              const p = selectedSession as PlannedSession;
              const sportColor = getSportColor(p.sport);
              return (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ backgroundColor: sportColor }}>
                      <SportIcon sport={p.sport} size={20} />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-foreground">{p.title}</div>
                      <div className="text-sm text-muted-foreground">
                        Planlagt — {format(parseISO(p.scheduledDate), "EEEE d. MMMM yyyy")}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {p.targetDurationSeconds && (
                      <div className="rounded-lg bg-muted/30 p-3 text-center">
                        <div className="text-2xl font-bold text-foreground">{formatDuration(p.targetDurationSeconds)}</div>
                        <div className="text-xs text-muted-foreground">Maal varighed</div>
                      </div>
                    )}
                    {p.targetTss != null && (
                      <div className="rounded-lg bg-muted/30 p-3 text-center">
                        <div className="text-2xl font-bold text-foreground">{Math.round(p.targetTss)}</div>
                        <div className="text-xs text-muted-foreground">Maal TSS</div>
                      </div>
                    )}
                    <div className="rounded-lg bg-muted/30 p-3 text-center">
                      <div className="text-sm font-bold text-foreground">{p.sessionPurpose}</div>
                      <div className="text-xs text-muted-foreground mt-1">Formaal</div>
                    </div>
                  </div>

                  {p.description && (
                    <div className="rounded-lg border border-border bg-muted/10 p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Beskrivelse</div>
                      <p className="text-sm text-foreground">{p.description}</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
