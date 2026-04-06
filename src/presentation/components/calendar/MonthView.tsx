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
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { getPhaseForDate, PHASE_COLORS } from "@/domain/utils/phase-colors";
import type { Session } from "@/domain/types/training.types";
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

  // Build 6 weeks of days
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let day = calStart;
    for (let w = 0; w < 6; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(day);
        day = addDays(day, 1);
      }
      // Only include week if at least one day is in the current month
      if (week.some((d) => isSameMonth(d, monthStart))) {
        result.push(week);
      }
    }
    return result;
  }, [calStart.toISOString(), monthStart.toISOString()]);

  // Group entries by day + compute TSS per sport per day
  const dayData = useMemo(() => {
    const map = new Map<string, { tss: number; sportTss: Record<string, number>; hasPlanned: boolean; entries: CalendarEntry[] }>();
    let maxDayTss = 1;

    const filtered = sportFilter
      ? entries.filter((e) => e.type === "brick" || e.data.sport === sportFilter)
      : entries;

    for (const entry of filtered) {
      let dateStr: string;
      let tss = 0;
      let sport = "";

      if (entry.type === "completed") {
        dateStr = format(parseISO(entry.data.startedAt), "yyyy-MM-dd");
        tss = (entry.data as Session).tss ?? 0;
        sport = entry.data.sport;
      } else if (entry.type === "planned") {
        dateStr = format(parseISO(entry.data.scheduledDate), "yyyy-MM-dd");
        tss = entry.data.targetTss ?? 0;
        sport = entry.data.sport;
      } else {
        dateStr = (entry.data as SessionBrick).startedAt.split("T")[0];
        tss = (entry.data as SessionBrick).totalTss ?? 0;
        sport = "brick";
      }

      if (!map.has(dateStr)) map.set(dateStr, { tss: 0, sportTss: {}, hasPlanned: false, entries: [] });
      const d = map.get(dateStr)!;
      d.tss += tss;
      d.sportTss[sport] = (d.sportTss[sport] || 0) + tss;
      d.entries.push(entry);
      if (entry.type === "planned") d.hasPlanned = true;
    }

    for (const d of map.values()) {
      if (d.tss > maxDayTss) maxDayTss = d.tss;
    }

    return { map, maxDayTss };
  }, [entries, sportFilter]);

  // Goals by day
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

  // Weekly TSS totals
  const weekTss = useMemo(() => {
    const m = new Map<number, number>();
    for (const [key, data] of dayData.map) {
      const d = new Date(key);
      const wn = getISOWeek(d);
      m.set(wn, (m.get(wn) || 0) + data.tss);
    }
    return m;
  }, [dayData]);

  if (isLoading) {
    return (
      <div data-testid="calendar-month-view" className="h-96 animate-pulse rounded-lg bg-muted/50" />
    );
  }

  return (
    <div data-testid="calendar-month-view" className="space-y-3">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => onDateChange(subMonths(currentDate, 1))} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          <ChevronLeft size={16} /> Forrige
        </button>
        <h2 className="text-lg font-semibold text-foreground">
          {MONTH_NAMES[monthIdx]} {year}
        </h2>
        <button onClick={() => onDateChange(addMonths(currentDate, 1))} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          Naeste <ChevronRight size={16} />
        </button>
      </div>

      {/* Calendar grid with week numbers */}
      <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-px rounded-lg border border-border overflow-hidden bg-border">
        {/* Header row */}
        <div className="bg-muted/50 p-1 text-center text-[10px] font-medium text-muted-foreground">Uge</div>
        {DAY_HEADERS.map((d) => (
          <div key={d} className="bg-muted/50 p-1 text-center text-[10px] font-medium text-muted-foreground">{d}</div>
        ))}

        {/* Week rows */}
        {weeks.map((week, wi) => {
          const wn = getISOWeek(week[0]);
          const wTss = weekTss.get(wn) ?? 0;

          // Phase for this week
          const phase = getPhaseForDate(format(week[0], "yyyy-MM-dd"), phases);

          return (
            <div key={wi} className="contents">
              {/* Week number cell */}
              <div className="flex flex-col items-center justify-center bg-card p-1">
                <span className="text-[10px] font-bold text-muted-foreground">{wn}</span>
                {wTss > 0 && <span className="text-[8px] text-muted-foreground">{Math.round(wTss)}</span>}
                {phase && (
                  <div className="mt-0.5 h-1 w-full rounded-full" style={{ backgroundColor: phase.color }} />
                )}
              </div>

              {/* Day cells */}
              {week.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                const dd = dayData.map.get(key);
                const dayGoals = goalsByDay.get(key) ?? [];

                return (
                  <div
                    key={key}
                    data-testid={`month-day-${key}`}
                    onClick={() => onDayClick?.(day)}
                    className={`relative min-h-[80px] cursor-pointer p-1 transition-colors hover:bg-muted/30 ${
                      inMonth ? "bg-card" : "bg-muted/20"
                    } ${isToday ? "ring-1 ring-primary ring-inset" : ""}`}
                  >
                    {/* Date number */}
                    <div className={`text-right text-xs ${inMonth ? "text-foreground" : "text-muted-foreground/40"}`}>
                      {format(day, "d")}
                    </div>

                    {/* Goal pin */}
                    {dayGoals.map((g) => (
                      <div key={g.id} className="flex items-center gap-0.5 text-[8px]" title={g.title}>
                        <MapPin size={8} style={{ color: g.racePriority === "A" ? "#EF4444" : "#EAB308" }} />
                      </div>
                    ))}

                    {/* TSS bar (proportional height, colored by sport) */}
                    {dd && dd.tss > 0 && (
                      <div className="absolute bottom-1 left-1 right-1">
                        <div
                          className="flex w-full overflow-hidden rounded-sm"
                          style={{ height: `${Math.max(4, (dd.tss / dayData.maxDayTss) * 36)}px` }}
                        >
                          {Object.entries(dd.sportTss).map(([sport, sportTss]) => {
                            const pct = (sportTss / dd.tss) * 100;
                            return (
                              <div
                                key={sport}
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: sport === "brick" ? "#EAB308" : getSportColor(sport),
                                  opacity: dd.hasPlanned ? 0.4 : 0.8,
                                }}
                              />
                            );
                          })}
                        </div>
                        <div className="text-center text-[8px] font-medium text-muted-foreground">
                          {Math.round(dd.tss)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
