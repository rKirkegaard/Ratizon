import { useMemo, useState } from "react";
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
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Clock, Trash2, Coffee, MapPin, Zap, Heart, TrendingUp } from "lucide-react";
import { useSessionTimeSeries } from "@/application/hooks/training/useSessions";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import SessionPopup from "@/presentation/components/calendar/SessionPopup";
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

function getSessionTypeLabel(t: string): string {
  const map: Record<string, string> = {
    endurance: "Udholdenhed", tempo: "Tempo", sweet_spot: "Sweet Spot",
    threshold: "Taerskel", vo2max: "VO2max", recovery: "Restitution",
    interval: "Interval", race: "Konkurrence", easy: "Let",
    long: "Lang", base: "Base", hard: "Haardt",
  };
  return map[t] || t;
}

/** Compact inline charts for expanded week session */
function WeekSessionCharts({ athleteId, sessionId, sport }: { athleteId: string | null; sessionId: string; sport: string }) {
  const { data: timeSeries } = useSessionTimeSeries(athleteId, sessionId);

  const chartData = useMemo(() => {
    if (!timeSeries?.points || timeSeries.points.length === 0) return [];
    let elapsed = 0;
    const raw = timeSeries.points.map((p: any, i: number) => {
      if (i > 0 && timeSeries.points[i - 1]) {
        const prev = new Date(timeSeries.points[i - 1].timestamp).getTime();
        const curr = new Date(p.timestamp).getTime();
        elapsed += (curr - prev) / 1000;
      }
      return { sec: elapsed, hr: p.hr, power: p.power, speed: p.speed };
    });
    // Downsample to ~60 points
    if (raw.length <= 60) return raw;
    const step = Math.ceil(raw.length / 60);
    const result: typeof raw = [];
    for (let i = 0; i < raw.length; i += step) {
      const chunk = raw.slice(i, Math.min(i + step, raw.length));
      const hrV = chunk.filter((c) => c.hr != null);
      const pwV = chunk.filter((c) => c.power != null);
      const spV = chunk.filter((c) => c.speed != null && c.speed > 0);
      result.push({
        sec: chunk[0].sec,
        hr: hrV.length > 0 ? Math.round(hrV.reduce((s, c) => s + c.hr, 0) / hrV.length) : null,
        power: pwV.length > 0 ? Math.round(pwV.reduce((s, c) => s + c.power, 0) / pwV.length) : null,
        speed: spV.length > 0 ? spV.reduce((s, c) => s + c.speed, 0) / spV.length : null,
      });
    }
    return result;
  }, [timeSeries]);

  if (chartData.length < 5) return null;

  const hasHr = chartData.some((d) => d.hr != null);
  const hasPwr = chartData.some((d) => d.power != null && d.power > 0);
  const hasSpd = chartData.some((d) => d.speed != null && d.speed > 0);
  const fmtTime = (sec: number) => { const m = Math.floor(sec / 60); return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 > 0 ? (m % 60) + "m" : ""}`; };

  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${[hasHr, hasPwr, hasSpd].filter(Boolean).length}, 1fr)` }}>
      {hasHr && (
        <div className="bg-muted/20 rounded px-1 pt-1">
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground mb-0.5"><Heart className="h-2.5 w-2.5 text-red-500" />Puls</div>
          <div style={{ height: 48 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 2, left: -20, bottom: -4 }}>
                <defs><linearGradient id={`whr-${sessionId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="sec" tickFormatter={fmtTime} tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                <YAxis domain={["dataMin - 10", "dataMax + 10"]} tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
                <Area type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={1} fill={`url(#whr-${sessionId})`} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {hasPwr && (
        <div className="bg-muted/20 rounded px-1 pt-1">
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground mb-0.5"><Zap className="h-2.5 w-2.5 text-yellow-500" />Watt</div>
          <div style={{ height: 48 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 2, left: -20, bottom: -4 }}>
                <defs><linearGradient id={`wpwr-${sessionId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#eab308" stopOpacity={0.3} /><stop offset="95%" stopColor="#eab308" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="sec" tickFormatter={fmtTime} tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                <YAxis domain={["dataMin - 20", "dataMax + 20"]} tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
                <Area type="monotone" dataKey="power" stroke="#eab308" strokeWidth={1} fill={`url(#wpwr-${sessionId})`} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {hasSpd && (
        <div className="bg-muted/20 rounded px-1 pt-1">
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground mb-0.5"><TrendingUp className="h-2.5 w-2.5 text-blue-500" />{sport === "bike" ? "km/t" : "Pace"}</div>
          <div style={{ height: 48 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.map((d) => ({ ...d, paceOrSpeed: d.speed && d.speed > 0 ? (sport === "bike" ? Math.round(d.speed * 3.6 * 10) / 10 : Math.round((1000 / d.speed / 60) * 100) / 100) : null }))} margin={{ top: 2, right: 2, left: -20, bottom: -4 }}>
                <defs><linearGradient id={`wspd-${sessionId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="sec" tickFormatter={fmtTime} tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                <YAxis reversed={sport !== "bike"} tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
                <Area type="monotone" dataKey="paceOrSpeed" stroke="#3b82f6" strokeWidth={1} fill={`url(#wspd-${sessionId})`} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const selectedAthleteId = useAthleteStore((s) => s.selectedAthleteId);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [popupSession, setPopupSession] = useState<Session | PlannedSession | null>(null);
  const [popupType, setPopupType] = useState<"completed" | "planned">("completed");

  const toggleExpand = (id: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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
                    const sportColor = getSportColor(s.sport);
                    const isExpanded = expandedSessions.has(String(s.id));

                    if (!isExpanded) {
                      // ── Collapsed: IronCoach Card style ──
                      return (
                        <div
                          key={`c-${s.id}`}
                          data-testid={`session-completed-${s.id}`}
                          onClick={() => { setPopupSession(s); setPopupType("completed"); }}
                          className="rounded-lg border border-border/50 bg-muted/40 p-2 cursor-pointer hover:shadow-md transition-shadow border-l-4"
                          style={{ borderLeftColor: sportColor }}
                        >
                          <div className="flex items-start gap-2">
                            <SportIcon sport={s.sport} size={16} className="mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleExpand(String(s.id)); }}
                                className="flex w-full items-center gap-1 text-[10px] uppercase tracking-wide font-medium text-muted-foreground hover:text-foreground"
                              >
                                <span className="truncate">
                                  {getSessionTypeLabel(s.sessionType) || s.sport}
                                </span>
                                <ChevronDown className="h-3 w-3 ml-auto flex-shrink-0" />
                              </button>
                              <div className="text-[10px] text-muted-foreground">
                                {formatDuration(s.durationSeconds)}
                                {s.distanceMeters != null && s.distanceMeters > 0 && (
                                  <span className="ml-1">· {formatDistance(s.distanceMeters)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ── Expanded: IronCoach Card with metrics + charts ──
                    return (
                      <div
                        key={`c-${s.id}`}
                        data-testid={`session-completed-${s.id}`}
                        onClick={() => { setPopupSession(s); setPopupType("completed"); }}
                        className="rounded-lg border border-border/50 bg-card p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4"
                        style={{ borderLeftColor: sportColor }}
                      >
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <SportIcon sport={s.sport} size={16} />
                          <div className="min-w-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleExpand(String(s.id)); }}
                              className="flex w-full flex-col items-start gap-0.5"
                            >
                              <div className="flex w-full items-center gap-1 text-[10px] uppercase tracking-wide font-medium text-muted-foreground hover:text-foreground">
                                <span className="truncate">
                                  {getSessionTypeLabel(s.sessionType) || s.sport}
                                </span>
                                <ChevronUp className="h-3 w-3 ml-auto" />
                              </div>
                              <span className="text-xs text-muted-foreground normal-case">
                                {format(parseISO(s.startedAt), "HH:mm")}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Metrics grid — matching IronCoach 2-col layout */}
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                          <div className="text-muted-foreground">Varighed</div>
                          <div className="text-foreground">{formatDuration(s.durationSeconds)}</div>
                          <div className="text-muted-foreground">Distance</div>
                          <div className="text-foreground">{s.distanceMeters ? formatDistance(s.distanceMeters) : "–"}</div>
                          <div className="text-muted-foreground">Gns. puls</div>
                          <div className="text-foreground">{s.avgHr ?? "–"}</div>
                          <div className="text-muted-foreground">TSS</div>
                          <div className="text-foreground">{s.tss != null ? Math.round(s.tss) : "–"}</div>
                          {s.avgPower != null && (
                            <><div className="text-muted-foreground">Effekt</div><div className="text-foreground">{s.avgPower}W</div></>
                          )}
                        </div>

                        {/* Compact charts */}
                        <div className="mt-2">
                          <WeekSessionCharts athleteId={selectedAthleteId} sessionId={String(s.id)} sport={s.sport} />
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
                      onClick={() => { setPopupSession(p); setPopupType("planned"); }}
                      className="group relative rounded border border-dashed bg-muted/20 px-2 py-1.5 opacity-60 cursor-pointer"
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

      {/* Session detail popup — same as MonthView */}
      {popupSession && (
        <SessionPopup
          session={popupSession}
          sessionType={popupType}
          athleteId={selectedAthleteId ?? ""}
          onClose={() => setPopupSession(null)}
        />
      )}
    </div>
  );
}
