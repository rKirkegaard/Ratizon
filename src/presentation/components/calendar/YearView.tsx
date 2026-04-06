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
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
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

function heatColor(tss: number, maxTss: number): string {
  if (tss === 0) return "var(--muted)";
  const ratio = tss / maxTss;
  if (ratio < 0.2) return "#86EFAC";
  if (ratio < 0.4) return "#4ADE80";
  if (ratio < 0.6) return "#22C55E";
  if (ratio < 0.8) return "#16A34A";
  return "#15803D";
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
  const year = getYear(currentDate);

  const { dayTss, maxDayTss } = useMemo(() => {
    const map = new Map<string, number>();
    let max = 1;
    const filtered = sportFilter
      ? entries.filter((e) => e.type === "brick" || e.data.sport === sportFilter)
      : entries;

    for (const entry of filtered) {
      let dateStr: string;
      let tss = 0;
      if (entry.type === "completed") {
        dateStr = format(parseISO(entry.data.startedAt), "yyyy-MM-dd");
        tss = (entry.data as Session).tss ?? 0;
      } else if (entry.type === "planned") {
        dateStr = format(parseISO(entry.data.scheduledDate), "yyyy-MM-dd");
        tss = entry.data.targetTss ?? 0;
      } else {
        dateStr = (entry.data as SessionBrick).startedAt.split("T")[0];
        tss = (entry.data as SessionBrick).totalTss ?? 0;
      }
      map.set(dateStr, (map.get(dateStr) || 0) + tss);
    }
    for (const v of map.values()) if (v > max) max = v;
    return { dayTss: map, maxDayTss: max };
  }, [entries, sportFilter]);

  const goalsByDate = useMemo(() => {
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

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIdx) => {
      const ms = new Date(year, monthIdx, 1);
      const me = endOfMonth(ms);
      const gridStart = startOfWeek(ms, { weekStartsOn: 1 });

      const weeks: Array<Array<{ date: Date; inMonth: boolean; key: string }>> = [];
      let d = gridStart;
      for (let w = 0; w < 6; w++) {
        const week: Array<{ date: Date; inMonth: boolean; key: string }> = [];
        for (let di = 0; di < 7; di++) {
          week.push({ date: d, inMonth: isSameMonth(d, ms), key: format(d, "yyyy-MM-dd") });
          d = addDays(d, 1);
        }
        if (week.some((dd) => dd.inMonth)) weeks.push(week);
      }

      let monthTss = 0;
      for (let dd = new Date(ms); dd <= me; dd = addDays(dd, 1)) {
        monthTss += dayTss.get(format(dd, "yyyy-MM-dd")) || 0;
      }

      const monthPhases = phases.filter((p) => {
        const ps = new Date(p.startDate).getTime();
        const pe = new Date(p.endDate).getTime();
        return ps <= me.getTime() && pe >= ms.getTime();
      });

      return { monthIdx, ms, weeks, monthTss: Math.round(monthTss), monthPhases };
    });
  }, [year, dayTss, phases]);

  if (isLoading) {
    return <div data-testid="calendar-year-view" className="h-96 animate-pulse rounded-lg bg-muted/50" />;
  }

  return (
    <div data-testid="calendar-year-view" className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => onDateChange(subYears(currentDate, 1))} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          <ChevronLeft size={16} /> {year - 1}
        </button>
        <h2 className="text-lg font-semibold text-foreground">{year}</h2>
        <button onClick={() => onDateChange(addYears(currentDate, 1))} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          {year + 1} <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {months.map(({ monthIdx, ms, weeks, monthTss, monthPhases }) => (
          <div
            key={monthIdx}
            data-testid={`year-month-${monthIdx}`}
            onClick={() => onMonthClick(ms)}
            className="cursor-pointer rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/20"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{SHORT_MONTHS[monthIdx]}</span>
              <span className="text-xs text-muted-foreground">{monthTss > 0 ? `${monthTss} TSS` : ""}</span>
            </div>

            {monthPhases.length > 0 && (
              <div className="mb-1.5 flex h-1 w-full overflow-hidden rounded-full">
                {monthPhases.map((p, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: PHASE_COLORS[p.phaseType] || "#6B7280" }} title={p.phaseName} />
                ))}
              </div>
            )}

            <div className="space-y-[2px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex gap-[2px]">
                  {week.map(({ date, inMonth, key }) => {
                    const tss = dayTss.get(key) || 0;
                    const dayGoals = goalsByDate.get(key);
                    const hasGoal = !!dayGoals && dayGoals.length > 0;
                    const isARace = dayGoals?.some((g) => g.racePriority === "A");

                    return (
                      <div
                        key={key}
                        className={`h-[10px] w-[10px] rounded-[2px] ${!inMonth ? "opacity-0" : ""} ${
                          hasGoal ? (isARace ? "ring-1 ring-red-500" : "ring-1 ring-amber-500") : ""
                        }`}
                        style={{ backgroundColor: inMonth ? heatColor(tss, maxDayTss) : "transparent" }}
                        title={inMonth ? `${format(date, "d. MMM")}: ${Math.round(tss)} TSS${hasGoal ? " — " + dayGoals![0].title : ""}` : ""}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {(() => {
              const monthGoals = goals.filter((g) => {
                if (!g.targetDate) return false;
                const gd = new Date(g.targetDate);
                return gd.getMonth() === monthIdx && gd.getFullYear() === year;
              });
              if (monthGoals.length === 0) return null;
              return (
                <div className="mt-1.5 space-y-0.5">
                  {monthGoals.map((g) => (
                    <div key={g.id} className="flex items-center gap-1 text-[9px]">
                      <MapPin size={8} style={{ color: g.racePriority === "A" ? "#EF4444" : g.racePriority === "B" ? "#EAB308" : "#3B82F6" }} />
                      <span className="truncate text-muted-foreground">{g.title}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
