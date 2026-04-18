import { useMemo } from "react";
import {
  endOfMonth,
  addYears,
  subYears,
  format,
  isSameMonth,
  getYear,
  getISOWeek,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { formatDuration, formatDistance } from "@/domain/utils/formatters";
import { PHASE_COLORS } from "@/domain/utils/phase-colors";
import type { Session } from "@/domain/types/training.types";
import type {
  CalendarEntry,
  CalendarPhase,
  CalendarGoal,
} from "@/application/hooks/planning/useCalendar";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

interface YearViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  entries: CalendarEntry[];
  sportFilter: string | null;
  isLoading: boolean;
  onMonthClick: (date: Date) => void;
  phases: CalendarPhase[];
  goals: CalendarGoal[];
}

export default function YearView({
  currentDate,
  onDateChange,
  entries,
  sportFilter,
  isLoading,
  onMonthClick,
  phases,
  goals,
}: YearViewProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const year = getYear(currentDate);
  const swimColor = getSportColor("swim");
  const bikeColor = getSportColor("bike");
  const runColor = getSportColor("run");

  const { weeklyData, maxWeekDuration, monthData, yearStats } = useMemo(() => {
    const weekMap = new Map<number, { duration: number; tss: number; swim: number; bike: number; run: number }>();
    const dayMap = new Map<string, { swim: number; bike: number; run: number; total: number }>();
    let totalDuration = 0;
    let totalDistance = 0;
    let totalTss = 0;
    let totalActivities = 0;
    const sportTotals: Record<string, { duration: number; distance: number }> = {};

    const completed = (sportFilter
      ? entries.filter((e) => e.type === "completed" && e.data.sport === sportFilter)
      : entries.filter((e) => e.type === "completed")
    ) as Array<{ type: "completed"; data: Session }>;

    for (const entry of completed) {
      const s = entry.data;
      const date = parseISO(s.startedAt);
      const wn = getISOWeek(date);
      const dayKey = format(date, "yyyy-MM-dd");

      if (!weekMap.has(wn)) weekMap.set(wn, { duration: 0, tss: 0, swim: 0, bike: 0, run: 0 });
      const w = weekMap.get(wn)!;
      w.duration += s.durationSeconds;
      w.tss += s.tss ?? 0;
      if (s.sport === "swim") w.swim += s.durationSeconds;
      else if (s.sport === "bike") w.bike += s.durationSeconds;
      else if (s.sport === "run") w.run += s.durationSeconds;

      if (!dayMap.has(dayKey)) dayMap.set(dayKey, { swim: 0, bike: 0, run: 0, total: 0 });
      const d = dayMap.get(dayKey)!;
      d.total += s.durationSeconds;
      if (s.sport === "swim") d.swim += s.durationSeconds;
      else if (s.sport === "bike") d.bike += s.durationSeconds;
      else if (s.sport === "run") d.run += s.durationSeconds;

      totalDuration += s.durationSeconds;
      totalDistance += s.distanceMeters ?? 0;
      totalTss += s.tss ?? 0;
      totalActivities += 1;
      if (!sportTotals[s.sport]) sportTotals[s.sport] = { duration: 0, distance: 0 };
      sportTotals[s.sport].duration += s.durationSeconds;
      sportTotals[s.sport].distance += s.distanceMeters ?? 0;
    }

    let maxWD = 1;
    for (const w of weekMap.values()) if (w.duration > maxWD) maxWD = w.duration;

    const weeklyData = Array.from({ length: 52 }, (_, i) => weekMap.get(i + 1) ?? { duration: 0, tss: 0, swim: 0, bike: 0, run: 0 });

    const monthData = Array.from({ length: 12 }, (_, mi) => {
      const ms = new Date(year, mi, 1);
      const me = endOfMonth(ms);
      const daysInMonth = me.getDate();
      let monthDuration = 0;
      let maxDayDuration = 1;
      const bySport: Record<string, { duration: number; distance: number; count: number }> = {};
      const dailyBars: Array<{ swim: number; bike: number; run: number; total: number }> = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dayKey = format(new Date(year, mi, d), "yyyy-MM-dd");
        const dd = dayMap.get(dayKey) ?? { swim: 0, bike: 0, run: 0, total: 0 };
        dailyBars.push(dd);
        monthDuration += dd.total;
        if (dd.total > maxDayDuration) maxDayDuration = dd.total;
      }

      for (const entry of completed) {
        if (!isSameMonth(parseISO(entry.data.startedAt), ms)) continue;
        const sp = entry.data.sport;
        if (!bySport[sp]) bySport[sp] = { duration: 0, distance: 0, count: 0 };
        bySport[sp].duration += entry.data.durationSeconds;
        bySport[sp].distance += entry.data.distanceMeters ?? 0;
        bySport[sp].count += 1;
      }

      const monthGoals = goals.filter((g) => {
        if (!g.targetDate) return false;
        const gd = new Date(g.targetDate);
        return gd.getMonth() === mi && gd.getFullYear() === year;
      });

      const monthPhases = phases.filter((p) => {
        const ps = new Date(p.startDate).getTime();
        const pe = new Date(p.endDate).getTime();
        return ps <= me.getTime() && pe >= ms.getTime();
      });

      // Build day-aligned phase segments for the phase band
      // Each segment: { startDay (0-based), endDay (inclusive, 0-based), phase }
      const phaseSegments: Array<{ startDay: number; endDay: number; phase: CalendarPhase }> = [];
      if (monthPhases.length > 0) {
        for (const p of monthPhases) {
          const pStart = new Date(p.startDate).getTime();
          const pEnd = new Date(p.endDate).getTime();
          const segStart = Math.max(0, Math.floor((pStart - ms.getTime()) / 86400000));
          const segEnd = Math.min(daysInMonth - 1, Math.floor((pEnd - ms.getTime()) / 86400000));
          if (segEnd >= 0 && segStart < daysInMonth) {
            phaseSegments.push({ startDay: Math.max(segStart, 0), endDay: Math.min(segEnd, daysInMonth - 1), phase: p });
          }
        }
        // Sort by startDay
        phaseSegments.sort((a, b) => a.startDay - b.startDay);
      }

      return { mi, ms, monthDuration, bySport, dailyBars, maxDayDuration, monthGoals, monthPhases, phaseSegments, daysInMonth };
    });

    return { weeklyData, maxWeekDuration: maxWD, monthData, yearStats: { totalDuration, totalDistance, totalTss, totalActivities, sportTotals } };
  }, [entries, sportFilter, year, goals, phases]);

  if (isLoading) {
    return <div data-testid="calendar-year-view" className="h-96 animate-pulse rounded-lg bg-muted/50" />;
  }

  return (
    <div data-testid="calendar-year-view" className="space-y-4">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => onDateChange(subYears(currentDate, 1))} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          <ChevronLeft size={16} /> {year - 1}
        </button>
        <h2 className="text-lg font-semibold text-foreground">Aarsoversigt {year}</h2>
        <button onClick={() => onDateChange(addYears(currentDate, 1))} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          {year + 1} <ChevronRight size={16} />
        </button>
      </div>

      {/* Year stats */}
      <div data-testid="year-stats" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-[10px] text-muted-foreground"><Clock size={10} className="mr-1 inline" />Timer</div>
          <div className="text-xl font-bold text-foreground">{Math.round(yearStats.totalDuration / 3600)}t</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-[10px] text-muted-foreground">Kilometer</div>
          <div className="text-xl font-bold text-foreground">{Math.round(yearStats.totalDistance / 1000)} km</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-[10px] text-muted-foreground">TSS</div>
          <div className="text-xl font-bold text-foreground">{Math.round(yearStats.totalTss)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-[10px] text-muted-foreground">Aktiviteter</div>
          <div className="text-xl font-bold text-foreground">{yearStats.totalActivities}</div>
        </div>
      </div>

      {/* Sport totals */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {Object.entries(yearStats.sportTotals).map(([sport, data]) => (
          <span key={sport} className="flex items-center gap-1">
            <SportIcon sport={sport} size={14} />
            {formatDuration(data.duration)} · {formatDistance(data.distance)}
          </span>
        ))}
      </div>

      {/* 52-week stacked bar */}
      <div data-testid="weekly-activity-bar" className="rounded-lg border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>52-ugers aktivitetsbar</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded" style={{ backgroundColor: runColor }} />Loeb</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded" style={{ backgroundColor: bikeColor }} />Cykel</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded" style={{ backgroundColor: swimColor }} />Svoem</span>
          </div>
        </div>
        <div className="flex h-16 items-end gap-px">
          {weeklyData.map((w, i) => {
            const totalPct = Math.max(w.duration > 0 ? 3 : 1, (w.duration / maxWeekDuration) * 100);
            return (
              <div key={i} className="flex flex-1 flex-col justify-end" style={{ height: "100%" }} title={`Uge ${i + 1}: ${Math.round(w.tss)} TSS · ${formatDuration(w.duration)}`}>
                {w.swim > 0 && <div style={{ height: `${(w.swim / w.duration) * totalPct}%`, backgroundColor: swimColor }} />}
                {w.bike > 0 && <div style={{ height: `${(w.bike / w.duration) * totalPct}%`, backgroundColor: bikeColor }} />}
                {w.run > 0 && <div style={{ height: `${(w.run / w.duration) * totalPct}%`, backgroundColor: runColor }} />}
                {w.duration === 0 && <div style={{ height: "1%", backgroundColor: "var(--muted)" }} />}
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[8px] text-muted-foreground/50">
          <span>Jan</span><span>Apr</span><span>Jul</span><span>Okt</span><span>Dec</span>
        </div>
      </div>

      {/* Month cards grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {monthData.map(({ mi, ms, monthDuration, bySport, dailyBars, maxDayDuration, monthGoals, phaseSegments, daysInMonth }) => {
          const isCurrent = mi === new Date().getMonth() && year === new Date().getFullYear();
          const hasARace = monthGoals.some((g) => g.racePriority === "A");

          return (
            <div
              key={mi}
              data-testid={`year-month-${mi}`}
              onClick={() => onMonthClick(ms)}
              className={`cursor-pointer rounded-lg border bg-card p-2.5 transition-colors hover:bg-muted/20 ${
                isCurrent ? "border-primary ring-1 ring-primary/30" : hasARace ? "border-red-500/50" : "border-border"
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{SHORT_MONTHS[mi]}</span>
                <span className="text-[10px] text-muted-foreground">{monthDuration > 0 ? `${Math.round(monthDuration / 3600)}t` : ""}</span>
              </div>

              {/* Phase band — day-aligned colored segments */}
              {phaseSegments.length > 0 && (
                <div className="mb-1.5 flex h-[5px] w-full overflow-hidden rounded-full bg-muted/30">
                  {(() => {
                    const elements: React.ReactNode[] = [];
                    let cursor = 0;
                    for (let si = 0; si < phaseSegments.length; si++) {
                      const seg = phaseSegments[si];
                      // Gap before this segment (no phase)
                      if (seg.startDay > cursor) {
                        elements.push(
                          <div
                            key={`gap-${si}`}
                            style={{ flex: seg.startDay - cursor }}
                          />
                        );
                      }
                      const span = seg.endDay - seg.startDay + 1;
                      elements.push(
                        <div
                          key={`phase-${si}`}
                          className="group relative"
                          style={{
                            flex: span,
                            backgroundColor: (seg.phase as any).color || PHASE_COLORS[seg.phase.phaseType] || "#6B7280",
                          }}
                          title={seg.phase.phaseName}
                        >
                          <div className="pointer-events-none absolute -top-6 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-popover px-1.5 py-0.5 text-[9px] font-medium text-popover-foreground shadow-md group-hover:block">
                            {seg.phase.phaseName}
                          </div>
                        </div>
                      );
                      cursor = seg.endDay + 1;
                    }
                    // Trailing gap
                    if (cursor < daysInMonth) {
                      elements.push(
                        <div key="gap-end" style={{ flex: daysInMonth - cursor }} />
                      );
                    }
                    return elements;
                  })()}
                </div>
              )}

              {/* Discipline bars */}
              {Object.keys(bySport).length > 0 && (
                <div className="mb-1.5 space-y-0.5">
                  {["swim", "bike", "run"].map((sport) => {
                    const data = bySport[sport];
                    if (!data) return null;
                    const maxDur = Math.max(...Object.values(bySport).map((d) => d.duration));
                    const pct = maxDur > 0 ? (data.duration / maxDur) * 100 : 0;
                    return (
                      <div key={sport} className="flex items-center gap-1">
                        <SportIcon sport={sport} size={8} />
                        <div className="h-1.5 flex-1 rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: getSportColor(sport) }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Daily stacked bars with goal markers */}
              <div className="relative">
                {/* Goal markers positioned above the day bars */}
                {monthGoals.length > 0 && (
                  <div className="flex gap-px mb-0.5" style={{ height: 10 }}>
                    {Array.from({ length: daysInMonth }).map((_, di) => {
                      const dayGoals = monthGoals.filter((g) => {
                        if (!g.targetDate) return false;
                        const gd = new Date(g.targetDate);
                        return gd.getDate() === di + 1 && gd.getMonth() === mi;
                      });
                      if (dayGoals.length === 0) return <div key={di} className="flex-1" />;
                      const g = dayGoals[0];
                      const color = g.racePriority === "A" ? "#EF4444" : g.racePriority === "B" ? "#EAB308" : "#3B82F6";
                      const tt = g.raceTargetTime ? `${Math.floor(g.raceTargetTime / 3600)}:${String(Math.floor((g.raceTargetTime % 3600) / 60)).padStart(2, "0")}` : null;
                      return (
                        <div key={di} className="group/pin flex-1 flex justify-center relative" onClick={(e) => e.stopPropagation()}>
                          <div className="w-1.5 h-1.5 rounded-full cursor-default" style={{ backgroundColor: color }} />
                          {/* Hover popup on the date dot */}
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 z-20 mb-1 hidden w-56 rounded-lg border border-border bg-card p-3 shadow-xl group-hover/pin:block">
                            <div className="text-sm font-bold text-foreground">{g.title}</div>
                            {g.targetDate && <div className="text-xs text-muted-foreground">{new Date(g.targetDate).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}</div>}
                            <div className="mt-1.5 flex items-center gap-2">
                              {g.racePriority && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: color }}>{g.racePriority}-race</span>}
                              {tt && <span className="text-sm font-bold text-foreground">{tt}</span>}
                            </div>
                            {(g.swimTargetTime || g.bikeTargetTime || g.runTargetTime) && (
                              <div className="mt-2 space-y-1 text-xs">
                                {g.swimTargetTime != null && g.swimTargetTime > 0 && <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><SportIcon sport="swim" size={12} /> Svoem</span><span className="font-medium">{Math.floor(g.swimTargetTime / 3600)}:{String(Math.floor((g.swimTargetTime % 3600) / 60)).padStart(2, "0")}</span></div>}
                                {g.t1TargetTime != null && g.t1TargetTime > 0 && <div className="flex items-center justify-between text-[10px] text-muted-foreground pl-5"><span>T1</span><span>{Math.floor(g.t1TargetTime / 60)}:{String(g.t1TargetTime % 60).padStart(2, "0")}</span></div>}
                                {g.bikeTargetTime != null && g.bikeTargetTime > 0 && <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><SportIcon sport="bike" size={12} /> Cykel</span><span className="font-medium">{Math.floor(g.bikeTargetTime / 3600)}:{String(Math.floor((g.bikeTargetTime % 3600) / 60)).padStart(2, "0")}</span></div>}
                                {g.t2TargetTime != null && g.t2TargetTime > 0 && <div className="flex items-center justify-between text-[10px] text-muted-foreground pl-5"><span>T2</span><span>{Math.floor(g.t2TargetTime / 60)}:{String(g.t2TargetTime % 60).padStart(2, "0")}</span></div>}
                                {g.runTargetTime != null && g.runTargetTime > 0 && <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><SportIcon sport="run" size={12} /> Loeb</span><span className="font-medium">{Math.floor(g.runTargetTime / 3600)}:{String(Math.floor((g.runTargetTime % 3600) / 60)).padStart(2, "0")}</span></div>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="relative flex h-8 items-end gap-px">
                  {dailyBars.map((d, di) => {
                    const pct = maxDayDuration > 0 ? (d.total / maxDayDuration) * 100 : 0;
                    const h = Math.max(pct > 0 ? 3 : 0, pct);
                    // Week separator: thin line on Mondays (except day 1)
                    const dayOfWeek = new Date(year, mi, di + 1).getDay();
                    const isMonday = dayOfWeek === 1 && di > 0;
                    return (
                      <div key={di} className="flex flex-1 flex-col justify-end relative" style={{ height: "100%" }}>
                        {isMonday && <div className="absolute left-0 top-0 bottom-0 w-px bg-border/40" />}
                        {d.swim > 0 && <div style={{ height: `${(d.swim / d.total) * h}%`, backgroundColor: swimColor }} />}
                        {d.bike > 0 && <div style={{ height: `${(d.bike / d.total) * h}%`, backgroundColor: bikeColor }} />}
                        {d.run > 0 && <div style={{ height: `${(d.run / d.total) * h}%`, backgroundColor: runColor }} />}
                      </div>
                    );
                  })}
                </div>
                {/* Week numbers below bars */}
                <div className="flex gap-px mt-0.5">
                  {Array.from({ length: daysInMonth }).map((_, di) => {
                    const d = new Date(year, mi, di + 1);
                    const isMonday = d.getDay() === 1;
                    // ISO week number
                    const weekNum = isMonday ? (() => {
                      const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1;
                      const wday = d.getDay() || 7;
                      return Math.ceil((dayOfYear - wday + 10) / 7);
                    })() : null;
                    return (
                      <div key={di} className="flex-1 relative">
                        {weekNum != null && (
                          <span className="absolute left-0 text-[6px] text-muted-foreground/40 leading-none">{weekNum}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Goal labels with hover popup */}
              {monthGoals.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {monthGoals.map((g) => {
                    const color = g.racePriority === "A" ? "#EF4444" : g.racePriority === "B" ? "#EAB308" : "#3B82F6";
                    const targetTime = g.raceTargetTime ? `${Math.floor(g.raceTargetTime / 3600)}:${String(Math.floor((g.raceTargetTime % 3600) / 60)).padStart(2, "0")}` : null;
                    return (
                      <div key={g.id} className="group/goal relative flex items-center gap-1 text-[8px] cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="truncate text-muted-foreground">{g.title}</span>
                        {/* Hover popup with full race details */}
                        <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-1 hidden w-72 rounded-lg border border-border bg-card p-4 shadow-xl group-hover/goal:block">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="text-base font-bold text-foreground">{g.title}</div>
                              {g.targetDate && <div className="text-sm text-muted-foreground">{new Date(g.targetDate).toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>}
                            </div>
                            {g.racePriority && (
                              <span className="rounded-full px-2.5 py-1 text-xs font-bold text-white shrink-0 ml-2" style={{ backgroundColor: color }}>{g.racePriority}-race</span>
                            )}
                          </div>
                          {/* Info grid */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-3">
                            {g.sport && <div><span className="text-muted-foreground">Sport: </span><span className="text-foreground capitalize">{g.sport}</span></div>}
                            {g.goalType && <div><span className="text-muted-foreground">Type: </span><span className="text-foreground">{g.goalType}</span></div>}
                            {g.raceDistance != null && g.raceDistance > 0 && <div><span className="text-muted-foreground">Distance: </span><span className="text-foreground font-medium">{(g.raceDistance / 1000).toFixed(1)} km</span></div>}
                            {targetTime && <div><span className="text-muted-foreground">Maaltid: </span><span className="text-foreground font-bold">{targetTime}</span></div>}
                          </div>
                          {/* Discipline breakdown */}
                          {(g.swimTargetTime || g.bikeTargetTime || g.runTargetTime) && (
                            <div className="border-t border-border/30 pt-3 space-y-2">
                              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disciplin-maal</div>
                              {g.swimTargetTime != null && g.swimTargetTime > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-2"><SportIcon sport="swim" size={14} /> Svoem</span>
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
                                  <span className="flex items-center gap-2"><SportIcon sport="bike" size={14} /> Cykel</span>
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
                                  <span className="flex items-center gap-2"><SportIcon sport="run" size={14} /> Loeb</span>
                                  <span className="font-semibold text-foreground">{Math.floor(g.runTargetTime / 3600)}:{String(Math.floor((g.runTargetTime % 3600) / 60)).padStart(2, "0")}:{String(g.runTargetTime % 60).padStart(2, "0")}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {g.notes && <div className="mt-3 border-t border-border/30 pt-2 text-xs text-muted-foreground/70 italic">{g.notes}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sport counts */}
              {Object.keys(bySport).length > 0 && (
                <div className="mt-1 flex gap-2 text-[9px] text-muted-foreground">
                  {Object.entries(bySport).map(([sport, data]) => (
                    <span key={sport} className="flex items-center gap-0.5">
                      <SportIcon sport={sport} size={8} /> {data.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
