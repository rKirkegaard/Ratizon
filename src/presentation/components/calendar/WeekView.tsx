import { useMemo, useState, useCallback } from "react";
import {
  DndContext, DragOverlay, useSensor, useSensors, PointerSensor,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
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
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Clock, Trash2, Coffee, MapPin, Zap, Heart, TrendingUp, CheckCircle2, Target, Waves, Bike, Footprints } from "lucide-react";
import { useSessionTimeSeries } from "@/application/hooks/training/useSessions";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
} from "recharts";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import SessionPopup from "@/presentation/components/calendar/SessionPopup";
import CreateSessionDialog from "@/presentation/components/layout/CreateSessionDialog";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useAthleteProfile } from "@/application/hooks/athlete/useAthleteProfile";
import { formatDuration, formatDistance } from "@/domain/utils/formatters";
import { getPhaseForDate, PHASE_LABELS } from "@/domain/utils/phase-colors";
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
    recovery: "Restitution", endurance: "Udholdenhed", tempo: "Tempo",
    sweet_spot: "Sweet Spot", threshold: "Threshold", vo2max: "VO2Max",
    anaerobic: "Anaerobic",
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

// ── DnD helper components ─────────────────────────────────────────────

function DroppableDayCell({ dateStr, children }: { dateStr: string; children: (isDropTarget: boolean) => React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });
  return (
    <div ref={setNodeRef}>
      {children(isOver)}
    </div>
  );
}

function DraggablePlannedSession({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-20 scale-95" : ""}`}>
      {children}
    </div>
  );
}

import { calcPlannedSessionMetrics } from "@/domain/utils/sessionMetrics";

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
  onAddSession?: (dateStr: string) => void;
  phases: CalendarPhase[];
  goals: CalendarGoal[];
  pmcPoints: Array<{ date: string; ctl: number; atl: number; tsb: number }>;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export default function WeekView({
  currentDate,
  onDateChange,
  entries,
  sportFilter,
  isLoading,
  onDeletePlanned,
  onMovePlanned,
  onAddSession,
  phases,
  goals,
  pmcPoints,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: WeekViewProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const selectedAthleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: profileData } = useAthleteProfile(selectedAthleteId);
  const athleteThresholdPace = (profileData?.data ?? (profileData as any))?.runThresholdPace ?? null;
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [popupSession, setPopupSession] = useState<Session | PlannedSession | null>(null);
  const [popupType, setPopupType] = useState<"completed" | "planned">("completed");
  const [editSession, setEditSession] = useState<PlannedSession | null>(null);

  // Drag-and-drop state
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 5 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggedSessionId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedSessionId(null);
    if (!over || !onMovePlanned) return;
    const sessionId = active.id as string;
    const targetDate = over.id as string;
    // Only move if target is a valid date string
    if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      onMovePlanned(sessionId, targetDate);
    }
  }, [onMovePlanned]);

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
    const planned = entries.filter((e) => e.type === "planned") as Array<{ type: "planned"; data: PlannedSession }>;
    const brickEntries = entries.filter((e) => e.type === "brick") as Array<{ type: "brick"; data: SessionBrick }>;
    const filteredCompleted = sportFilter ? completed.filter((e) => e.data.sport === sportFilter) : completed;
    const filteredPlanned = sportFilter ? planned.filter((e) => e.data.sport === sportFilter) : planned;

    // Completed stats
    let totalTss = 0;
    let totalDuration = 0;
    const sportBreakdown: Record<string, { tss: number; duration: number; distance: number; count: number }> = {};

    for (const e of filteredCompleted) {
      totalTss += e.data.tss ?? 0;
      totalDuration += e.data.durationSeconds;
      if (!sportBreakdown[e.data.sport]) sportBreakdown[e.data.sport] = { tss: 0, duration: 0, distance: 0, count: 0 };
      sportBreakdown[e.data.sport].tss += e.data.tss ?? 0;
      sportBreakdown[e.data.sport].duration += e.data.durationSeconds;
      sportBreakdown[e.data.sport].distance += e.data.distanceMeters ?? 0;
      sportBreakdown[e.data.sport].count += 1;
    }

    for (const b of brickEntries) {
      totalTss += b.data.totalTss ?? 0;
      totalDuration += b.data.totalDurationSeconds;
    }

    // Planned stats
    let plannedTss = 0;
    let plannedDuration = 0;
    const plannedBySport: Record<string, { tss: number; duration: number; distance: number; count: number }> = {};

    for (const e of filteredPlanned) {
      const eMetrics = calcPlannedSessionMetrics(e.data, athleteThresholdPace);
      const eTss = eMetrics.tss;
      const eDur = eMetrics.durationSec;
      plannedTss += eTss;
      plannedDuration += eDur;
      if (!plannedBySport[e.data.sport]) plannedBySport[e.data.sport] = { tss: 0, duration: 0, distance: 0, count: 0 };
      plannedBySport[e.data.sport].tss += eTss;
      plannedBySport[e.data.sport].duration += eDur;
      plannedBySport[e.data.sport].distance += eMetrics.distanceKm * 1000;
      plannedBySport[e.data.sport].count += 1;
    }

    // CTL delta from PMC
    let ctlDelta = 0;
    if (pmcPoints.length > 0) {
      const wsKey = format(weekStart, "yyyy-MM-dd");
      const weKey = format(weekEnd, "yyyy-MM-dd");
      const weekPmc = pmcPoints.filter((p) => p.date.split("T")[0] >= wsKey && p.date.split("T")[0] <= weKey);
      if (weekPmc.length >= 2) ctlDelta = weekPmc[weekPmc.length - 1].ctl - weekPmc[0].ctl;
    }

    return {
      totalTss, totalDuration, sportBreakdown, sessionCount: filteredCompleted.length + brickEntries.length, ctlDelta,
      plannedTss, plannedDuration, plannedBySport, plannedCount: filteredPlanned.length,
    };
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
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(7, 1fr) minmax(180px, 1.4fr)" }}>
        {days.map((day, idx) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEntries = entriesByDay.get(key) ?? [];
          const isToday = isSameDay(day, new Date());
          const isFuture = isAfter(day, new Date());
          const dayGoals = goalsByDay.get(key) ?? [];
          const isRestDay = dayEntries.length === 0 && !isFuture;

          return (
            <DroppableDayCell key={key} dateStr={key}>
            {(isDropTarget) => (
            <div
              data-testid={`week-day-${key}`}
              className={`group/day min-h-[400px] flex flex-col rounded-lg border p-2 ${
                isToday ? "border-primary bg-primary/5" : isDropTarget ? "border-primary ring-2 ring-primary ring-inset bg-primary/5" : "border-border bg-card"
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
              <div className="flex-1 space-y-1.5">
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

                  // Planned session (draggable)
                  const p = entry.data as PlannedSession;
                  const sportColor = getSportColor(p.sport);
                  const pMetrics = calcPlannedSessionMetrics(p, athleteThresholdPace);
                  const pDuration = pMetrics.durationSec;
                  const purposeLabel = p.sessionPurpose ? {
                    endurance: "UDHOLDENHED", tempo: "TEMPO", sweet_spot: "SWEET SPOT",
                    threshold: "TAERSKEL", vo2max: "VO2MAX", recovery: "RESTITUTION",
                    interval: "INTERVAL", race: "KONKURRENCE",
                  }[p.sessionPurpose] ?? p.sessionPurpose.toUpperCase() : null;
                  return (
                    <DraggablePlannedSession key={`p-${p.id}`} id={p.id}>
                    <div
                      data-testid={`session-planned-${p.id}`}
                      onClick={() => { setPopupSession(p); setPopupType("planned"); }}
                      className="group relative rounded-lg border border-border/50 bg-muted/40 p-2 cursor-pointer hover:shadow-md transition-shadow border-l-4"
                      style={{ borderLeftColor: sportColor }}
                    >
                      <div className="flex items-start gap-2">
                        {selectionMode && onToggleSelect && (
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onToggleSelect(p.id); }}
                            className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                              selectedIds?.has(p.id) ? "bg-primary border-primary" : "border-muted-foreground/40"
                            }`}
                          >
                            {selectedIds?.has(p.id) && <CheckCircle2 size={10} className="text-primary-foreground" />}
                          </button>
                        )}
                        <SportIcon sport={p.sport} size={16} className="mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex w-full items-center gap-1 text-[10px] uppercase tracking-wide font-medium text-muted-foreground">
                            <span className="truncate">
                              {purposeLabel || p.title || "Planlagt"}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {pDuration > 0 && formatDuration(pDuration)}
                            {pMetrics.distanceKm > 0 && (
                              <span className="ml-1">· {pMetrics.distanceKm.toFixed(1)} km</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Delete button */}
                      {onDeletePlanned && !selectionMode && (
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDeletePlanned(p.id); }}
                          className="absolute right-1 top-1 hidden rounded p-0.5 text-muted-foreground hover:text-red-400 group-hover:block"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                    </DraggablePlannedSession>
                  );
                })}

                {/* Rest day or empty future day */}
                {dayEntries.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/40 group-hover/day:text-muted-foreground/60 transition-colors">
                    {isRestDay ? (
                      <div className="flex flex-col items-center transition-all relative">
                        <Coffee size={18} className="group-hover/day:animate-[wiggle_0.8s_ease_2] transition-transform duration-300" />
                        {/* Sleeping stick figure appears on hover — lying down */}
                        <div className="mt-1 opacity-0 group-hover/day:opacity-100 transition-opacity duration-500 relative">
                          <span className="text-[18px] inline-block rotate-90" style={{ filter: "grayscale(1) brightness(0.6)" }}>🧍</span>
                          <span className="absolute -top-1.5 left-4 text-[9px] text-muted-foreground/40 group-hover/day:animate-[fadeInOut_2s_ease_infinite]">zzz</span>
                        </div>
                        <span className="text-[10px] -mt-0.5">Hviledag</span>
                      </div>
                    ) : isFuture ? (
                      <div className="flex flex-col items-center">
                        <div className="relative h-6 w-6 group-hover/day:[&>*]:text-muted-foreground/30">
                          <Waves size={18} className="absolute inset-0 m-auto opacity-0 group-hover/day:animate-[fadeInOut_4.5s_ease_infinite_0s] transition-opacity" />
                          <Bike size={18} className="absolute inset-0 m-auto opacity-0 group-hover/day:animate-[fadeInOut_4.5s_ease_infinite_1.5s] transition-opacity" />
                          <Footprints size={18} className="absolute inset-0 m-auto opacity-0 group-hover/day:animate-[fadeInOut_4.5s_ease_infinite_3s] transition-opacity" />
                        </div>
                        <span className="mt-1 text-[10px]">Ingen planlagt</span>
                      </div>
                    ) : (
                      <span className="text-[10px]">Ingen traeninger</span>
                    )}
                  </div>
                )}

              </div>

              {/* Bottom button: "Slip her" when dragging, "+ Tilfoej" on hover */}
              {isDropTarget ? (
                <div className="mt-auto w-full rounded border-2 border-dashed border-primary bg-primary/10 py-1 text-center text-[10px] font-medium text-primary">
                  Slip her
                </div>
              ) : onAddSession && (isToday || isFuture) ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddSession(key); }}
                  className="mt-auto w-full rounded border border-dashed border-transparent py-1 text-[10px] text-transparent group-hover/day:border-border group-hover/day:text-muted-foreground/50 hover:!border-primary hover:!text-primary transition-colors"
                >
                  + Tilfoej
                </button>
              ) : null}
            </div>
            )}
            </DroppableDayCell>
          );
        })}

        {/* Week summary column — same format as MonthView Uge Total */}
        <div data-testid="week-summary" className="min-h-[400px] rounded-lg border border-border bg-muted/30 p-3 overflow-hidden">
          <div className="text-xs font-semibold text-foreground mb-2">
            Uge {getISOWeek(weekStart)}
            <span className="ml-1 text-muted-foreground font-normal">Uge total</span>
          </div>

          <div className="space-y-3">
            {/* Completed section */}
            {weekSummary.sessionCount > 0 && (
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2 font-medium text-foreground mb-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Gennemfoert
                  <span className="text-muted-foreground">{formatDuration(weekSummary.totalDuration)}</span>
                </div>
                {weekSummary.totalTss > 0 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Zap className="h-3 w-3 text-amber-400" />
                    {Math.ceil(weekSummary.totalTss)} TSS
                  </div>
                )}
                {Object.entries(weekSummary.sportBreakdown).map(([sport, data]) => (
                  <div key={sport} className="flex items-center gap-1 pl-2 text-xs flex-wrap" style={{ color: getSportColor(sport) }}>
                    <SportIcon sport={sport} size={12} />
                    <span>{formatDuration(data.duration)}</span>
                    {data.distance > 0 && <span className="text-muted-foreground">- {formatDistance(data.distance)}</span>}
                    <span className="text-muted-foreground ml-auto">{Math.round(data.tss)} TSS</span>
                  </div>
                ))}
              </div>
            )}

            {/* Planned section */}
            {weekSummary.plannedCount > 0 && (
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2 font-medium text-muted-foreground mb-1">
                  <Target className="h-3 w-3 text-blue-500" />
                  Planlagt
                  <span className="text-muted-foreground">{formatDuration(weekSummary.plannedDuration)}</span>
                </div>
                {weekSummary.plannedTss > 0 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Zap className="h-3 w-3 text-amber-400" />
                    {Math.ceil(weekSummary.plannedTss)} TSS
                  </div>
                )}
                {Object.entries(weekSummary.plannedBySport).map(([sport, data]) => (
                  <div key={sport} className="flex items-center gap-1 pl-2 text-xs flex-wrap" style={{ color: getSportColor(sport) }}>
                    <SportIcon sport={sport} size={12} />
                    <span>{formatDuration(data.duration)}</span>
                    {data.distance > 0 && <span className="text-muted-foreground">- {formatDistance(data.distance)}</span>}
                    <span className="text-muted-foreground ml-auto">{Math.round(data.tss)} TSS</span>
                  </div>
                ))}
              </div>
            )}

            {/* CTL delta */}
            {weekSummary.ctlDelta !== 0 && (
              <div className="border-t border-border pt-2">
                <div className="text-[10px] text-muted-foreground">CTL aendring</div>
                <div className={`text-sm font-bold ${weekSummary.ctlDelta > 0 ? "text-green-400" : "text-red-400"}`}>
                  {weekSummary.ctlDelta > 0 ? "+" : ""}{weekSummary.ctlDelta.toFixed(1)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {draggedSessionId && (
          <div className="rounded-lg border border-primary bg-card px-3 py-2 shadow-xl opacity-90 text-xs text-foreground">
            Flytter session...
          </div>
        )}
      </DragOverlay>
      </DndContext>

      {/* Session detail popup */}
      {popupSession && (
        <SessionPopup
          session={popupSession}
          sessionType={popupType}
          athleteId={selectedAthleteId ?? ""}
          onClose={() => setPopupSession(null)}
          onEditPlanned={(p) => setEditSession(p)}
        />
      )}

      {/* Edit session dialog */}
      <CreateSessionDialog
        open={!!editSession}
        onClose={() => setEditSession(null)}
        editSession={editSession as any}
      />
    </div>
  );
}
