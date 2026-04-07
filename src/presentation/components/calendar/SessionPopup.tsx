import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { X, Heart, Zap, TrendingUp, Clock, Pencil } from "lucide-react";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useSessionDetail, useSessionTimeSeries } from "@/application/hooks/training/useSessions";
import { apiClient } from "@/application/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatDuration, formatDistance } from "@/domain/utils/formatters";
import type { Session, PlannedSession } from "@/domain/types/training.types";

const SESSION_TYPE_LABELS: Record<string, string> = {
  recovery: "Restitution", endurance: "Udholdenhed", tempo: "Tempo",
  sweet_spot: "Sweet Spot", threshold: "Threshold", vo2max: "VO2Max",
  anaerobic: "Anaerobic",
};

const SESSION_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  recovery:   { bg: "bg-blue-500/20",   text: "text-blue-400",   border: "border-blue-500/30" },
  endurance:  { bg: "bg-green-500/20",  text: "text-green-400",  border: "border-green-500/30" },
  tempo:      { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
  sweet_spot: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
  threshold:  { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
  vo2max:     { bg: "bg-red-500/20",    text: "text-red-400",    border: "border-red-500/30" },
  anaerobic:  { bg: "bg-red-500/20",    text: "text-red-400",    border: "border-red-500/30" },
};

const ZONE_COLORS = ["#3B82F6", "#22C55E", "#EAB308", "#F97316", "#EF4444"];
const ZONE_LABELS = ["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5"];

interface SessionPopupProps {
  session: Session | PlannedSession;
  sessionType: "completed" | "planned";
  athleteId: string;
  onClose: () => void;
}

const SESSION_TYPE_OPTIONS = [
  { value: "recovery", label: "Restitution" },
  { value: "endurance", label: "Udholdenhed" },
  { value: "tempo", label: "Tempo" },
  { value: "sweet_spot", label: "Sweet Spot" },
  { value: "threshold", label: "Threshold" },
  { value: "vo2max", label: "VO2Max" },
  { value: "anaerobic", label: "Anaerobic" },
];

export default function SessionPopup({ session, sessionType, athleteId: propAthleteId, onClose }: SessionPopupProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const storeAthleteId = useAthleteStore((s) => s.selectedAthleteId);
  const athleteId = propAthleteId || storeAthleteId || "";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editingType, setEditingType] = useState(false);
  const [saving, setSaving] = useState(false);

  const sessionId = sessionType === "completed" ? String((session as Session).id) : null;
  const { data: detail } = useSessionDetail(athleteId, sessionId);
  const { data: timeSeries } = useSessionTimeSeries(athleteId, sessionId);

  // Build chart data — downsample to ~100 points with averaging (matching IronCoach)
  const chartData = useMemo(() => {
    if (!timeSeries?.points || timeSeries.points.length === 0) return [];

    // First build raw data with elapsed seconds
    let elapsed = 0;
    const raw = timeSeries.points.map((p: any, i: number) => {
      if (i > 0 && timeSeries.points[i - 1]) {
        const prev = new Date(timeSeries.points[i - 1].timestamp).getTime();
        const curr = new Date(p.timestamp).getTime();
        elapsed += (curr - prev) / 1000;
      }
      return { sec: elapsed, hr: p.hr, power: p.power, speed: p.speed };
    });

    // Downsample to ~100 points with chunk averaging
    const maxPoints = 100;
    if (raw.length <= maxPoints) return raw;

    const step = Math.ceil(raw.length / maxPoints);
    const result: typeof raw = [];
    for (let i = 0; i < raw.length; i += step) {
      const chunk = raw.slice(i, Math.min(i + step, raw.length));
      const hrVals = chunk.filter((c) => c.hr != null);
      const pwrVals = chunk.filter((c) => c.power != null);
      const spdVals = chunk.filter((c) => c.speed != null && c.speed > 0);
      result.push({
        sec: chunk[0].sec,
        hr: hrVals.length > 0 ? Math.round(hrVals.reduce((s, c) => s + c.hr, 0) / hrVals.length) : null,
        power: pwrVals.length > 0 ? Math.round(pwrVals.reduce((s, c) => s + c.power, 0) / pwrVals.length) : null,
        speed: spdVals.length > 0 ? spdVals.reduce((s, c) => s + c.speed, 0) / spdVals.length : null,
      });
    }
    return result;
  }, [timeSeries]);

  // Zone distribution from detail analytics
  const zoneData = useMemo(() => {
    const analytics = detail?.analytics;
    if (!analytics) return null;
    const zones = [
      analytics.zone1Seconds ?? 0,
      analytics.zone2Seconds ?? 0,
      analytics.zone3Seconds ?? 0,
      analytics.zone4Seconds ?? 0,
      analytics.zone5Seconds ?? 0,
    ];
    const total = zones.reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    return zones.map((sec, i) => ({
      zone: ZONE_LABELS[i],
      pct: Math.round((sec / total) * 100),
      fill: ZONE_COLORS[i],
    }));
  }, [detail]);

  if (sessionType === "completed") {
    const s = session as Session;
    const sportColor = getSportColor(s.sport);
    const typeColors = SESSION_TYPE_COLORS[s.sessionType] ?? { bg: "bg-muted", text: "text-foreground", border: "border-border" };
    const hasPower = s.avgPower != null || chartData.some((d) => d.power != null && d.power > 0);
    const hasSpeed = chartData.some((d) => d.speed != null && d.speed > 0);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div className="relative mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <button onClick={() => { onClose(); navigate(`/sessions/${s.id}`); }} className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary hover:bg-primary/20">
              Fuld analyse
            </button>
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ backgroundColor: sportColor }}>
              <SportIcon sport={s.sport} size={20} />
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold text-foreground">{s.title}</div>
              <div className="text-sm text-muted-foreground">
                {format(parseISO(s.startedAt), "EEEE d. MMMM yyyy 'kl.' HH:mm")}
                <span className="ml-2 text-[10px] text-muted-foreground/50">ID: {s.id}</span>
              </div>
            </div>
            {/* Session type — editable */}
            {editingType ? (
              <select
                autoFocus
                value={s.sessionType}
                onChange={async (e) => {
                  const newType = e.target.value;
                  setSaving(true);
                  try {
                    await apiClient.patch(`/training/sessions/${athleteId}/${s.id}`, { sessionType: newType });
                    (s as any).sessionType = newType;
                    queryClient.invalidateQueries({ queryKey: ["calendar-sessions"] });
                    queryClient.invalidateQueries({ queryKey: ["sessions"] });
                  } catch (err) {
                    console.error("Failed to update session type:", err);
                  } finally {
                    setSaving(false);
                    setEditingType(false);
                  }
                }}
                onBlur={() => setEditingType(false)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-bold text-foreground"
              >
                {SESSION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => setEditingType(true)}
                className={`group flex items-center gap-1.5 rounded-lg border px-3 py-1.5 cursor-pointer transition-all hover:ring-2 hover:ring-primary/40 ${typeColors.bg} ${typeColors.border}`}
                title="Klik for at aendre traeningstype"
              >
                <span className={`text-sm font-bold ${typeColors.text}`}>
                  {SESSION_TYPE_LABELS[s.sessionType] || s.sessionType}
                </span>
                <Pencil className={`h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ${typeColors.text}`} />
              </button>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="text-xl font-bold text-foreground">{formatDuration(s.durationSeconds)}</div>
              <div className="text-[10px] text-muted-foreground">Varighed</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="text-xl font-bold text-foreground">{s.tss != null ? Math.round(s.tss) : "–"}</div>
              <div className="text-[10px] text-muted-foreground">TSS</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="text-xl font-bold text-foreground">{s.distanceMeters ? formatDistance(s.distanceMeters) : "–"}</div>
              <div className="text-[10px] text-muted-foreground">Distance</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="text-xl font-bold text-foreground">{s.avgHr ?? "–"}</div>
              <div className="text-[10px] text-muted-foreground">Gns. puls</div>
            </div>
          </div>

          {/* Metrics row */}
          <div className="flex flex-wrap gap-3 mb-5">
            {s.maxHr != null && (
              <div className="flex items-center gap-1.5 rounded border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-xs">
                <Heart className="h-3.5 w-3.5 text-red-500" />
                <span className="text-foreground font-medium">Max HR {s.maxHr}</span>
              </div>
            )}
            {s.avgPower != null && (
              <div className="flex items-center gap-1.5 rounded border border-yellow-500/20 bg-yellow-500/5 px-2.5 py-1.5 text-xs">
                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                <span className="text-foreground font-medium">{s.avgPower}W avg</span>
                {s.normalizedPower && <span className="text-muted-foreground">(NP {s.normalizedPower})</span>}
              </div>
            )}
            {s.avgPace != null && (
              <div className="flex items-center gap-1.5 rounded border border-blue-500/20 bg-blue-500/5 px-2.5 py-1.5 text-xs">
                <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-foreground font-medium">
                  {Math.floor(s.avgPace / 60)}:{String(Math.round(s.avgPace % 60)).padStart(2, "0")}/km
                </span>
              </div>
            )}
            {s.avgCadence != null && (
              <div className="flex items-center gap-1.5 rounded border border-border bg-muted/20 px-2.5 py-1.5 text-xs">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{Math.round(s.avgCadence)} {s.sport === "bike" ? "rpm" : "spm"}</span>
              </div>
            )}
            {s.elevationGain != null && s.elevationGain > 0 && (
              <div className="flex items-center gap-1.5 rounded border border-border bg-muted/20 px-2.5 py-1.5 text-xs">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{Math.round(s.elevationGain)}m stigning</span>
              </div>
            )}
            {detail?.analytics?.efficiencyFactor != null && (
              <div className="flex items-center gap-1.5 rounded border border-border bg-muted/20 px-2.5 py-1.5 text-xs">
                <span className="text-foreground font-medium">EF {detail.analytics.efficiencyFactor.toFixed(2)}</span>
              </div>
            )}
            {detail?.analytics?.decoupling != null && (
              <div className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs ${
                detail.analytics.decoupling < 5 ? "border-green-500/20 bg-green-500/5" :
                detail.analytics.decoupling < 10 ? "border-amber-500/20 bg-amber-500/5" :
                "border-red-500/20 bg-red-500/5"
              }`}>
                <span className="text-foreground font-medium">Afkobling {detail.analytics.decoupling.toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* 3 charts grid — IronCoach style: 100 points, monotone, gradient fills */}
          {chartData.length > 5 && (() => {
            const fmtTime = (sec: number) => {
              const m = Math.floor(sec / 60);
              if (m < 60) return `${m}m`;
              const h = Math.floor(m / 60);
              const rm = m % 60;
              return `${h}h${rm > 0 ? rm + "m" : ""}`;
            };
            const hasHr = chartData.some((d) => d.hr != null);
            const hasPwr = hasPower;
            const hasSpd = hasSpeed;
            const chartCount = [hasHr, hasPwr, hasSpd].filter(Boolean).length;
            const cols = chartCount >= 3 ? "grid-cols-3" : chartCount === 2 ? "grid-cols-2" : "grid-cols-1";
            const paceData = hasSpd ? chartData.map((d) => ({
              ...d,
              paceOrSpeed: d.speed && d.speed > 0
                ? s.sport === "bike" ? Math.round(d.speed * 3.6 * 10) / 10 : Math.round((1000 / d.speed / 60) * 100) / 100
                : null,
            })) : [];

            return (
              <div className={`mb-5 grid gap-3 ${cols}`}>
                {/* HR chart */}
                {hasHr && (
                  <div className="px-2 pt-2 pb-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between h-5 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Heart className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        <span className="text-xs font-medium">Puls</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        <span className="font-medium text-foreground">{s.avgHr ?? "–"}</span> gns · <span className="font-medium text-foreground">{s.maxHr ?? "–"}</span> max
                      </span>
                    </div>
                    <div style={{ height: 80 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                          <defs>
                            <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="sec" tickFormatter={fmtTime} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={{ stroke: "hsl(var(--border))" }} interval="preserveStartEnd" minTickGap={30} />
                          <YAxis domain={["dataMin - 10", "dataMax + 10"]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={{ stroke: "hsl(var(--border))" }} width={35} tickFormatter={(v: number) => `${Math.round(v)}`} />
                          <Tooltip cursor={false} contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "11px", color: "hsl(var(--foreground))" }} formatter={(v: number) => [`${Math.round(v)} bpm`, "Puls"]} labelFormatter={(l: number) => fmtTime(l)} />
                          <Area type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={1.5} fill="url(#hrGrad)" connectNulls />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Power chart */}
                {hasPwr && (
                  <div className="px-2 pt-2 pb-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between h-5 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                        <span className="text-xs font-medium">Watt</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        <span className="font-medium text-foreground">{s.avgPower ?? "–"}</span> gns · <span className="font-medium text-foreground">{s.normalizedPower ?? "–"}</span> NP
                      </span>
                    </div>
                    <div style={{ height: 80 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                          <defs>
                            <linearGradient id="pwrGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="sec" tickFormatter={fmtTime} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={{ stroke: "hsl(var(--border))" }} interval="preserveStartEnd" minTickGap={30} />
                          <YAxis domain={["dataMin - 20", "dataMax + 20"]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={{ stroke: "hsl(var(--border))" }} width={35} tickFormatter={(v: number) => `${Math.round(v)}`} />
                          <Tooltip cursor={false} contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "11px", color: "hsl(var(--foreground))" }} formatter={(v: number) => [`${Math.round(v)}W`, "Power"]} labelFormatter={(l: number) => fmtTime(l)} />
                          <Area type="monotone" dataKey="power" stroke="#eab308" strokeWidth={1.5} fill="url(#pwrGrad)" connectNulls />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Pace/Speed chart */}
                {hasSpd && (
                  <div className="px-2 pt-2 pb-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between h-5 mb-2">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                        <span className="text-xs font-medium">{s.sport === "bike" ? "Hastighed" : "Pace"}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {s.sport === "bike"
                          ? <><span className="font-medium text-foreground">{s.distanceMeters ? Math.round(s.distanceMeters / s.durationSeconds * 3.6) : "–"}</span> km/t gns</>
                          : <><span className="font-medium text-foreground">{s.avgPace ? `${Math.floor(s.avgPace / 60)}:${String(Math.round(s.avgPace % 60)).padStart(2, "0")}` : "–"}</span>/km gns</>
                        }
                      </span>
                    </div>
                    <div style={{ height: 80 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={paceData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                          <defs>
                            <linearGradient id="paceGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="sec" tickFormatter={fmtTime} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={{ stroke: "hsl(var(--border))" }} interval="preserveStartEnd" minTickGap={30} />
                          <YAxis reversed={s.sport !== "bike"} domain={s.sport === "bike" ? ["dataMin - 5", "dataMax + 5"] : undefined} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={{ stroke: "hsl(var(--border))" }} width={35} />
                          <Tooltip cursor={false} contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "11px", color: "hsl(var(--foreground))" }} formatter={(v: number) => [s.sport === "bike" ? `${v} km/t` : `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, "0")}/km`, s.sport === "bike" ? "Hastighed" : "Pace"]} labelFormatter={(l: number) => fmtTime(l)} />
                          <Area type="monotone" dataKey="paceOrSpeed" stroke="#3b82f6" strokeWidth={1.5} fill="url(#paceGrad)" connectNulls />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Zone distribution */}
          {zoneData && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Zonefordeling</h4>
              <div className="flex h-6 w-full overflow-hidden rounded-lg">
                {zoneData.map((z, i) => (
                  z.pct > 0 && (
                    <div
                      key={i}
                      className="flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ width: `${z.pct}%`, backgroundColor: z.fill }}
                      title={`${z.zone}: ${z.pct}%`}
                    >
                      {z.pct >= 8 ? `${z.pct}%` : ""}
                    </div>
                  )
                ))}
              </div>
              <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                {zoneData.map((z, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: z.fill }} />
                    {z.zone} {z.pct}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {s.notes && (
            <div className="rounded-lg border border-border bg-muted/10 p-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">Noter</div>
              <p className="text-sm text-foreground">{s.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Planned session popup
  const p = session as PlannedSession;
  const sportColor = getSportColor(p.sport);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground">
          <X size={18} />
        </button>

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
      </div>
    </div>
  );
}
