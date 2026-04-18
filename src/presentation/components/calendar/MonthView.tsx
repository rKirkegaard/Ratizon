import { useMemo, useState } from "react";
import { calcPlannedSessionMetrics } from "@/domain/utils/sessionMetrics";
import { useAthleteProfile } from "@/application/hooks/athlete/useAthleteProfile";
import { useAthleteStore } from "@/application/stores/athleteStore";
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
import SessionPopup from "@/presentation/components/calendar/SessionPopup";
import ZoneBar from "@/presentation/components/calendar/ZoneBar";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
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
    recovery: "Restitution", endurance: "Udholdenhed", tempo: "Tempo",
    sweet_spot: "Sweet Spot", threshold: "Threshold", vo2max: "VO2Max",
    anaerobic: "Anaerobic",
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
  onAddSession?: (dateStr: string) => void;
  phases: CalendarPhase[];
  goals: CalendarGoal[];
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export default function MonthView({
  currentDate,
  onDateChange,
  entries,
  sportFilter,
  isLoading,
  onDayClick,
  goals,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: MonthViewProps) {
  const selectedAthleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: profileData } = useAthleteProfile(selectedAthleteId);
  const athleteThresholdPace = (profileData?.data ?? (profileData as any))?.runThresholdPace ?? null;
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const [selectedSession, setSelectedSession] = useState<Session | PlannedSession | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<CalendarGoal | null>(null);
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
          const pm = calcPlannedSessionMetrics(p, athleteThresholdPace);
          plannedDuration += pm.durationSec;
          plannedTss += pm.tss;
          plannedSessions += 1;
          if (!plannedBySport[p.sport]) plannedBySport[p.sport] = { count: 0, duration: 0, distance: 0, tss: 0 };
          plannedBySport[p.sport].count += 1;
          plannedBySport[p.sport].duration += pm.durationSec;
          plannedBySport[p.sport].distance += pm.distanceKm * 1000;
          plannedBySport[p.sport].tss += pm.tss;
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
        <div className="grid gap-0 border-b border-border" style={{ gridTemplateColumns: "repeat(7, 1fr) 200px" }}>
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
            <div key={wi} className="grid gap-0 border-b border-border/50 last:border-b-0" style={{ gridTemplateColumns: "repeat(7, 1fr) 200px" }}>
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
                      !inMonth ? "bg-muted/20 text-muted-foreground" : ""
                    } ${isToday ? "bg-primary/5" : ""}`}
                  >
                    <div className={`mb-1 text-sm ${isToday ? "font-bold text-primary" : inMonth ? "text-foreground" : "text-muted-foreground/50"}`}>
                      {format(day, "d")}
                    </div>

                    {/* Goal markers */}
                    {goals.filter((g) => g.targetDate && format(parseISO(g.targetDate), "yyyy-MM-dd") === key).map((g) => {
                      const gColor = g.racePriority === "A" ? "#EF4444" : g.racePriority === "B" ? "#EAB308" : "#3B82F6";
                      return (
                        <div key={g.id} className="mb-1 flex items-center gap-1 rounded px-1.5 py-1 text-[10px] cursor-pointer" style={{ backgroundColor: `${gColor}15`, borderLeft: `2px solid ${gColor}` }} onClick={(e) => { e.stopPropagation(); setSelectedGoal(selectedGoal?.id === g.id ? null : g); }}>
                          <span className="truncate font-medium uppercase tracking-wide" style={{ color: gColor }}>{g.racePriority}-race</span>
                          <span className="truncate text-foreground">{g.title}</span>
                        </div>
                      );
                    })}

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
                              onClick={(e) => {
                                e.stopPropagation();
                                if (selectionMode && onToggleSelect) { onToggleSelect(p.id); }
                                else { setSelectedSession(p); setSessionType("planned"); }
                              }}
                              className={`flex rounded overflow-hidden border border-dashed cursor-pointer ${
                                selectionMode && selectedIds?.has(p.id) ? "border-primary bg-primary/10" : "border-border/50 bg-muted/20"
                              }`}
                            >
                              {/* Selection checkbox */}
                              {selectionMode && (
                                <div className={`w-5 flex items-center justify-center shrink-0 ${selectedIds?.has(p.id) ? "bg-primary/20" : ""}`}>
                                  <div className={`w-3 h-3 rounded border ${selectedIds?.has(p.id) ? "bg-primary border-primary" : "border-muted-foreground/40"}`} />
                                </div>
                              )}
                              {/* Left sport border */}
                              <div className="w-[3px] shrink-0 rounded-l" style={{ backgroundColor: getSportColor(p.sport) }} />
                              {/* Content */}
                              <div className="flex-1 px-1.5 py-1 text-xs text-muted-foreground/60">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <SportIcon sport={p.sport} size={12} />
                                  <span className="font-medium text-[10px] italic">{p.title}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px]">
                                  {(() => { const m = calcPlannedSessionMetrics(p, athleteThresholdPace); return (<>
                                    {m.durationSec > 0 && <span>{formatDuration(m.durationSec)}</span>}
                                    {m.tss > 0 && <span className="flex items-center gap-0.5"><Target className="h-2.5 w-2.5" />{Math.round(m.tss)}</span>}
                                  </>); })()}
                                </div>
                              </div>
                              {/* Right zone bar */}
                              <ZoneBar blocks={p.sessionBlocks} targetZones={p.targetZones as any} width={3} />
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
                          <div key={sport} className="flex items-center gap-1 pl-2 whitespace-nowrap text-xs" style={{ color: getSportColor(sport) }}>
                            <SportIcon sport={sport} size={12} />
                            <span>{formatDuration(data.duration)}</span>
                            {data.distance > 0 && <span className="text-muted-foreground">- {formatDistance(data.distance)}</span>}
                            <span className="text-muted-foreground ml-auto">{Math.round(data.tss)} TSS</span>
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
                          <div key={sport} className="flex items-center gap-1 pl-2 whitespace-nowrap text-xs" style={{ color: getSportColor(sport) }}>
                            <SportIcon sport={sport} size={12} />
                            <span>{formatDuration(data.duration)}</span>
                            {data.distance > 0 && <span className="text-muted-foreground">- {formatDistance(data.distance)}</span>}
                            <span className="text-muted-foreground ml-auto">{Math.round(data.tss)} TSS</span>
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

      {/* Session Detail Popup with charts */}
      {selectedSession && (
        <SessionPopup
          session={selectedSession}
          sessionType={sessionType}
          athleteId={useAthleteStore.getState().selectedAthleteId ?? ""}
          onClose={() => setSelectedSession(null)}
        />
      )}

      {/* Goal Detail Popup */}
      {selectedGoal && (() => {
        const g = selectedGoal;
        const gColor = g.racePriority === "A" ? "#EF4444" : g.racePriority === "B" ? "#EAB308" : "#3B82F6";
        const tt = g.raceTargetTime ? `${Math.floor(g.raceTargetTime / 3600)}:${String(Math.floor((g.raceTargetTime % 3600) / 60)).padStart(2, "0")}` : null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelectedGoal(null)}>
            <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelectedGoal(null)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">✕</button>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-lg font-bold text-foreground">{g.title}</div>
                  {g.targetDate && <div className="text-sm text-muted-foreground">{new Date(g.targetDate).toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>}
                </div>
                <span className="rounded-full px-2.5 py-1 text-xs font-bold text-white shrink-0 ml-2" style={{ backgroundColor: gColor }}>{g.racePriority}-race</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                {g.sport && <div><span className="text-muted-foreground">Sport: </span><span className="text-foreground capitalize">{g.sport}</span></div>}
                {g.goalType && <div><span className="text-muted-foreground">Type: </span><span className="text-foreground">{g.goalType}</span></div>}
                {g.raceDistance != null && g.raceDistance > 0 && <div><span className="text-muted-foreground">Distance: </span><span className="font-medium">{(g.raceDistance / 1000).toFixed(1)} km</span></div>}
                {tt && <div><span className="text-muted-foreground">Maaltid: </span><span className="font-bold">{tt}</span></div>}
              </div>
              {(g.swimTargetTime || g.bikeTargetTime || g.runTargetTime) && (
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disciplin-maal</div>
                  {g.swimTargetTime != null && g.swimTargetTime > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><SportIcon sport="swim" size={16} /> Svoem</span>
                      <span className="font-semibold text-foreground">{Math.floor(g.swimTargetTime / 3600)}:{String(Math.floor((g.swimTargetTime % 3600) / 60)).padStart(2, "0")}:{String(g.swimTargetTime % 60).padStart(2, "0")}</span>
                    </div>
                  )}
                  {g.t1TargetTime != null && g.t1TargetTime > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground pl-6">
                      <span>T1 (skifte)</span>
                      <span>{Math.floor(g.t1TargetTime / 60)}:{String(g.t1TargetTime % 60).padStart(2, "0")}</span>
                    </div>
                  )}
                  {g.bikeTargetTime != null && g.bikeTargetTime > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><SportIcon sport="bike" size={16} /> Cykel</span>
                      <span className="font-semibold text-foreground">{Math.floor(g.bikeTargetTime / 3600)}:{String(Math.floor((g.bikeTargetTime % 3600) / 60)).padStart(2, "0")}:{String(g.bikeTargetTime % 60).padStart(2, "0")}</span>
                    </div>
                  )}
                  {g.t2TargetTime != null && g.t2TargetTime > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground pl-6">
                      <span>T2 (skifte)</span>
                      <span>{Math.floor(g.t2TargetTime / 60)}:{String(g.t2TargetTime % 60).padStart(2, "0")}</span>
                    </div>
                  )}
                  {g.runTargetTime != null && g.runTargetTime > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><SportIcon sport="run" size={16} /> Loeb</span>
                      <span className="font-semibold text-foreground">{Math.floor(g.runTargetTime / 3600)}:{String(Math.floor((g.runTargetTime % 3600) / 60)).padStart(2, "0")}:{String(g.runTargetTime % 60).padStart(2, "0")}</span>
                    </div>
                  )}
                </div>
              )}
              {g.notes && <div className="mt-3 border-t border-border pt-2 text-sm text-muted-foreground italic">{g.notes}</div>}
              <div className="mt-4 flex justify-end">
                <button onClick={() => { setSelectedGoal(null); window.location.href = "/saeson-maal"; }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Rediger maal
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
