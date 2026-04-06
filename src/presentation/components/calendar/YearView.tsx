import { useMemo } from "react";
import {
  endOfMonth,
  startOfWeek,
  addDays,
  addYears,
  subYears,
  format,
  isSameMonth,
  getYear,
  getISOWeek,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { formatDuration, formatDistance } from "@/domain/utils/formatters";
import { PHASE_COLORS } from "@/domain/utils/phase-colors";
import type { Session } from "@/domain/types/training.types";
import type { SessionBrick } from "@/domain/types/brick.types";
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

      return { mi, ms, monthDuration, bySport, dailyBars, maxDayDuration, monthGoals, monthPhases };
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
        {monthData.map(({ mi, ms, monthDuration, bySport, dailyBars, maxDayDuration, monthGoals, monthPhases }) => {
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

              {/* Phase band */}
              {monthPhases.length > 0 && (
                <div className="mb-1.5 flex h-1 w-full overflow-hidden rounded-full">
                  {monthPhases.map((p, i) => (
                    <div key={i} className="flex-1" style={{ backgroundColor: PHASE_COLORS[p.phaseType] || "#6B7280" }} title={p.phaseName} />
                  ))}
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

              {/* Daily stacked bars */}
              <div className="flex h-8 items-end gap-px">
                {dailyBars.map((d, di) => {
                  const pct = maxDayDuration > 0 ? (d.total / maxDayDuration) * 100 : 0;
                  const h = Math.max(pct > 0 ? 3 : 0, pct);
                  return (
                    <div key={di} className="flex flex-1 flex-col justify-end" style={{ height: "100%" }}>
                      {d.swim > 0 && <div style={{ height: `${(d.swim / d.total) * h}%`, backgroundColor: swimColor }} />}
                      {d.bike > 0 && <div style={{ height: `${(d.bike / d.total) * h}%`, backgroundColor: bikeColor }} />}
                      {d.run > 0 && <div style={{ height: `${(d.run / d.total) * h}%`, backgroundColor: runColor }} />}
                    </div>
                  );
                })}
              </div>

              {/* Goals */}
              {monthGoals.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {monthGoals.map((g) => (
                    <div key={g.id} className="flex items-center gap-1 text-[8px]">
                      <MapPin size={8} style={{ color: g.racePriority === "A" ? "#EF4444" : g.racePriority === "B" ? "#EAB308" : "#3B82F6" }} />
                      <span className="truncate text-muted-foreground">{g.title}</span>
                    </div>
                  ))}
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
