import { useMemo } from "react";
import {
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  getISOWeek,
  getYear,
  isSameDay,
  isAfter,
  parseISO,
  addWeeks,
  subWeeks,
} from "date-fns";
import { da } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Trash2, Coffee, MapPin } from "lucide-react";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { formatDuration, formatDistance } from "@/domain/utils/formatters";
import { getPhaseForDate, PHASE_COLORS, PHASE_LABELS } from "@/domain/utils/phase-colors";
import type { Session, PlannedSession } from "@/domain/types/training.types";
import type { SessionBrick } from "@/domain/types/brick.types";
import type {
  CalendarEntry,
  CalendarPhase,
  CalendarGoal,
} from "@/application/hooks/planning/useCalendar";

const DAY_NAMES = ["Man", "Tir", "Ons", "Tor", "Fre", "Loer", "Soen"];

// Zone-based border color: Z1-2=blue, Z3=yellow, Z4+=red
function getIntensityColor(sessionType: string | undefined): string {
  if (!sessionType) return "#6B7280";
  const lower = sessionType.toLowerCase();
  if (lower.includes("recovery") || lower.includes("easy") || lower.includes("endurance") || lower.includes("base"))
    return "#3B82F6"; // blue = Z1-2
  if (lower.includes("tempo") || lower.includes("sweet") || lower.includes("threshold"))
    return "#EAB308"; // yellow = Z3
  if (lower.includes("interval") || lower.includes("vo2") || lower.includes("race") || lower.includes("sprint") || lower.includes("hard"))
    return "#EF4444"; // red = Z4+
  return "#3B82F6"; // default blue
}

function tssBadgeColor(tss: number | null): string {
  if (tss === null) return "bg-muted text-muted-foreground";
  if (tss < 70) return "bg-green-500/15 text-green-400";
  if (tss <= 100) return "bg-amber-500/15 text-amber-400";
  return "bg-red-500/15 text-red-400";
}

interface WeekViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  entries: CalendarEntry[];
  sportFilter: string | null;
  isLoading: boolean;
  onDeletePlanned?: (id: string) => void;
  onMovePlanned?: (id: string, newDate: string) => void;
  phases: CalendarPhase[];
  goals: CalendarGoal[];
  pmcPoints: Array<{ date: string; ctl: number; atl: number; tsb: number }>;
}

export default function WeekView({
  currentDate,
  onDateChange,
  entries,
  sportFilter,
  isLoading,
  onDeletePlanned,
  phases,
  goals,
  pmcPoints,
}: WeekViewProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekNumber = getISOWeek(currentDate);
  const year = getYear(currentDate);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart.toISOString()]
  );

  // Current training phase
  const currentPhase = useMemo(
    () => getPhaseForDate(format(weekStart, "yyyy-MM-dd"), phases),
    [weekStart, phases]
  );

  // Goals in this week
  const weekGoals = useMemo(() => {
    const ws = weekStart.getTime();
    const we = weekEnd.getTime();
    return goals.filter((g) => {
      if (!g.targetDate) return false;
      const t = new Date(g.targetDate).getTime();
      return t >= ws && t <= we;
    });
  }, [goals, weekStart, weekEnd]);

  // Goals by day key
  const goalsByDay = useMemo(() => {
    const map = new Map<string, CalendarGoal[]>();
    for (const g of goals) {
      if (!g.targetDate) continue;
      const key = g.targetDate.split("T")[0];
      const arr = map.get(key) || [];
      arr.push(g);
      map.set(key, arr);
    }
    return map;
  }, [goals]);

  // Group entries by day
  const entriesByDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const day of days) map.set(format(day, "yyyy-MM-dd"), []);

    const filtered = sportFilter
      ? entries.filter((e) => {
          if (e.type === "brick") return true; // always show bricks
          const sport = e.data.sport;
          return sport === sportFilter;
        })
      : entries;

    for (const entry of filtered) {
      let dateStr: string;
      if (entry.type === "completed") dateStr = format(parseISO(entry.data.startedAt), "yyyy-MM-dd");
      else if (entry.type === "planned") dateStr = format(parseISO(entry.data.scheduledDate), "yyyy-MM-dd");
      else dateStr = entry.data.startedAt.split("T")[0]; // brick
      const existing = map.get(dateStr);
      if (existing) existing.push(entry);
    }
    return map;
  }, [entries, days, sportFilter]);

  // Week summary
  const weekSummary = useMemo(() => {
    const completed = entries.filter((e) => e.type === "completed") as Array<{ type: "completed"; data: Session }>;
    const brickEntries = entries.filter((e) => e.type === "brick") as Array<{ type: "brick"; data: SessionBrick }>;
    const filtered = sportFilter ? completed.filter((e) => e.data.sport === sportFilter) : completed;

    let totalTss = 0;
    let totalDuration = 0;
    const sportBreakdown: Record<string, { tss: number; duration: number; count: number }> = {};

    for (const e of filtered) {
      totalTss += e.data.tss ?? 0;
      totalDuration += e.data.durationSeconds;
      if (!sportBreakdown[e.data.sport]) sportBreakdown[e.data.sport] = { tss: 0, duration: 0, count: 0 };
      sportBreakdown[e.data.sport].tss += e.data.tss ?? 0;
      sportBreakdown[e.data.sport].duration += e.data.durationSeconds;
      sportBreakdown[e.data.sport].count += 1;
    }

    // Add brick TSS/duration
    for (const b of brickEntries) {
      totalTss += b.data.totalTss ?? 0;
      totalDuration += b.data.totalDurationSeconds;
    }

    // CTL delta from PMC
    let ctlDelta = 0;
    if (pmcPoints.length > 0) {
      const wsKey = format(weekStart, "yyyy-MM-dd");
      const weKey = format(weekEnd, "yyyy-MM-dd");
      const weekPmc = pmcPoints.filter((p) => p.date.split("T")[0] >= wsKey && p.date.split("T")[0] <= weKey);
      if (weekPmc.length >= 2) ctlDelta = weekPmc[weekPmc.length - 1].ctl - weekPmc[0].ctl;
    }

    return { totalTss, totalDuration, sportBreakdown, sessionCount: filtered.length + brickEntries.length, ctlDelta };
  }, [entries, sportFilter, pmcPoints, weekStart, weekEnd]);

  if (isLoading) {
    return (
      <div data-testid="calendar-week-view" className="space-y-3">
        <div className="h-8 w-full animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-8 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="calendar-week-view" className="space-y-3">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button data-testid="week-prev" onClick={() => onDateChange(subWeeks(currentDate, 1))} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          <ChevronLeft size={16} /> Forrige
        </button>
        <h2 data-testid="week-title" className="text-lg font-semibold text-foreground">
          Uge {weekNumber}, {year}
        </h2>
        <button data-testid="week-next" onClick={() => onDateChange(addWeeks(currentDate, 1))} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          Naeste <ChevronRight size={16} />
        </button>
      </div>

      {/* Phase header band */}
      {currentPhase && (
        <div
          data-testid="phase-band"
          className="flex items-center gap-2 rounded-lg border-l-[4px] px-4 py-2"
          style={{
            borderLeftColor: currentPhase.color,
            backgroundColor: `${currentPhase.color}15`,
          }}
        >
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: currentPhase.color }}>
            {PHASE_LABELS[currentPhase.phaseType] || currentPhase.phaseType}
          </span>
          <span className="text-xs text-muted-foreground">— {currentPhase.phaseName}</span>
        </div>
      )}

      {/* Week grid: 7 days + summary */}
      <div className="grid grid-cols-8 gap-2">
        {days.map((day, idx) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEntries = entriesByDay.get(key) ?? [];
          const isToday = isSameDay(day, new Date());
          const isFuture = isAfter(day, new Date());
          const dayGoals = goalsByDay.get(key) ?? [];
          const isRestDay = dayEntries.length === 0 && !isFuture;

          return (
            <div
              key={key}
              data-testid={`week-day-${key}`}
              className={`min-h-[200px] rounded-lg border p-2 ${
                isToday ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              {/* Day header */}
              <div className="mb-2 text-center">
                <div className="text-[10px] font-medium text-muted-foreground">{DAY_NAMES[idx]}</div>
                <div className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                  {format(day, "d. MMM", { locale: da })}
                </div>
              </div>

              {/* Goal pins */}
              {dayGoals.length > 0 && (
                <div className="mb-1.5 flex gap-1">
                  {dayGoals.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                      style={{
                        backgroundColor: g.racePriority === "A" ? "#EF444420" : g.racePriority === "B" ? "#EAB30820" : "#3B82F620",
                        color: g.racePriority === "A" ? "#EF4444" : g.racePriority === "B" ? "#EAB308" : "#3B82F6",
                      }}
                      title={g.title}
                    >
                      <MapPin size={8} /> {g.racePriority || "M"}-race
                    </div>
                  ))}
                </div>
              )}

              {/* Sessions */}
              <div className="space-y-1.5">
                {dayEntries.map((entry) => {
                  if (entry.type === "brick") {
                    const brick = entry.data as SessionBrick;
                    return (
                      <div
                        key={`b-${brick.id}`}
                        data-testid={`session-brick-${brick.id}`}
                        className="rounded border-l-[3px] bg-card px-2 py-1.5 shadow-sm"
                        style={{
                          borderImage: `linear-gradient(${brick.segments.map((s) => getSportColor(s.sport)).join(", ")}) 1`,
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <div className="flex -space-x-1">
                            {brick.segments.map((seg) => (
                              <SportIcon key={seg.id} sport={seg.sport} size={12} />
                            ))}
                          </div>
                          <span className="text-[9px] font-bold uppercase text-amber-400">BRICK</span>
                        </div>
                        <div className="mt-0.5 flex gap-1 text-[10px] text-muted-foreground">
                          <span><Clock size={10} /> {formatDuration(brick.totalDurationSeconds)}</span>
                          {brick.totalTss != null && (
                            <span className={`rounded-full px-1.5 ${tssBadgeColor(brick.totalTss)}`}>
                              {Math.round(brick.totalTss)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (entry.type === "completed") {
                    const s = entry.data as Session;
                    const intensityColor = getIntensityColor(s.sessionType);
                    return (
                      <div
                        key={`c-${s.id}`}
                        data-testid={`session-completed-${s.id}`}
                        className="rounded border-l-[3px] bg-card px-2 py-1.5 shadow-sm"
                        style={{ borderLeftColor: intensityColor }}
                      >
                        <div className="flex items-center gap-1">
                          <SportIcon sport={s.sport} size={13} />
                          <span className="truncate text-xs font-medium text-foreground">{s.title}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Clock size={9} /> {formatDuration(s.durationSeconds)}
                          </span>
                          {s.distanceMeters && s.distanceMeters > 0 && (
                            <span>{formatDistance(s.distanceMeters)}</span>
                          )}
                          {s.tss !== null && (
                            <span className={`rounded-full px-1.5 text-[10px] font-medium ${tssBadgeColor(s.tss)}`}>
                              {Math.round(s.tss)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Planned session
                  const p = entry.data as PlannedSession;
                  const sportColor = getSportColor(p.sport);
                  return (
                    <div
                      key={`p-${p.id}`}
                      data-testid={`session-planned-${p.id}`}
                      className="group relative rounded border border-dashed bg-muted/20 px-2 py-1.5 opacity-60"
                      style={{ borderColor: sportColor }}
                    >
                      <div className="flex items-center gap-1">
                        <SportIcon sport={p.sport} size={13} />
                        <span className="truncate text-xs font-medium italic text-muted-foreground">{p.title}</span>
                      </div>
                      <div className="mt-0.5 flex gap-1 text-[10px] text-muted-foreground/70">
                        {p.targetDurationSeconds && (
                          <span><Clock size={9} /> {formatDuration(p.targetDurationSeconds)}</span>
                        )}
                        {p.targetTss !== null && (
                          <span>Maal {Math.round(p.targetTss)}</span>
                        )}
                      </div>
                      {onDeletePlanned && (
                        <button
                          onClick={() => onDeletePlanned(p.id)}
                          className="absolute right-1 top-1 hidden rounded p-0.5 text-muted-foreground hover:text-red-400 group-hover:block"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Rest day or empty future day */}
                {dayEntries.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/40">
                    {isRestDay ? (
                      <>
                        <Coffee size={18} />
                        <span className="mt-1 text-[10px]">Hviledag</span>
                      </>
                    ) : (
                      <span className="text-[10px]">Ingen planlagt</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Week summary column */}
        <div data-testid="week-summary" className="min-h-[200px] rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-3 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ugeoversigt
          </div>
          <div className="space-y-3">
            {/* Session count */}
            <div>
              <div className="text-[10px] text-muted-foreground">Sessioner</div>
              <div className="text-xl font-bold text-foreground">{weekSummary.sessionCount}</div>
            </div>

            {/* Total time */}
            <div>
              <div className="text-[10px] text-muted-foreground">Total tid</div>
              <div className="text-sm font-semibold text-foreground">{formatDuration(weekSummary.totalDuration)}</div>
            </div>

            {/* Total TSS */}
            <div>
              <div className="text-[10px] text-muted-foreground">Total TSS</div>
              <div className={`inline-flex rounded-full px-2 py-0.5 text-sm font-bold ${tssBadgeColor(weekSummary.totalTss)}`}>
                {Math.round(weekSummary.totalTss)}
              </div>
            </div>

            {/* TSS stacked bar by sport */}
            {weekSummary.totalTss > 0 && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">TSS fordeling</div>
                <div className="flex h-3 w-full overflow-hidden rounded-full">
                  {Object.entries(weekSummary.sportBreakdown).map(([sport, data]) => {
                    const pct = (data.tss / weekSummary.totalTss) * 100;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={sport}
                        style={{ width: `${pct}%`, backgroundColor: getSportColor(sport) }}
                        title={`${sport}: ${Math.round(data.tss)} TSS`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* CTL delta */}
            {weekSummary.ctlDelta !== 0 && (
              <div>
                <div className="text-[10px] text-muted-foreground">CTL ændring</div>
                <div className={`text-sm font-bold ${weekSummary.ctlDelta > 0 ? "text-green-400" : "text-red-400"}`}>
                  {weekSummary.ctlDelta > 0 ? "+" : ""}{weekSummary.ctlDelta.toFixed(1)}
                </div>
              </div>
            )}

            {/* Per-sport breakdown */}
            <div className="border-t border-border pt-2">
              <div className="text-[10px] text-muted-foreground mb-1.5">Per sport</div>
              <div className="space-y-1">
                {Object.entries(weekSummary.sportBreakdown).map(([sport, data]) => (
                  <div key={sport} className="flex items-center gap-1.5">
                    <SportIcon sport={sport} size={11} />
                    <div className="flex-1 text-[10px]">
                      <span className="font-medium text-foreground">{data.count}x</span>
                      <span className="ml-1 text-muted-foreground">{formatDuration(data.duration)}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{Math.round(data.tss)}</span>
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
