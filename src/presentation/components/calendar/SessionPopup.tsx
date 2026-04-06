import { useMemo } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { X, Heart, Zap, TrendingUp, Clock } from "lucide-react";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useSessionDetail, useSessionTimeSeries } from "@/application/hooks/training/useSessions";
import { formatDuration, formatDistance } from "@/domain/utils/formatters";
import type { Session, PlannedSession } from "@/domain/types/training.types";

const SESSION_TYPE_LABELS: Record<string, string> = {
  endurance: "Udholdenhed", tempo: "Tempo", sweet_spot: "Sweet Spot",
  threshold: "Taerskel", vo2max: "VO2max", recovery: "Restitution",
  interval: "Interval", race: "Konkurrence", easy: "Let",
  long: "Lang", base: "Base", hard: "Haardt",
};

const SESSION_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  recovery:  { bg: "bg-blue-500/20",   text: "text-blue-400",   border: "border-blue-500/30" },
  easy:      { bg: "bg-blue-500/20",   text: "text-blue-400",   border: "border-blue-500/30" },
  endurance: { bg: "bg-green-500/20",  text: "text-green-400",  border: "border-green-500/30" },
  base:      { bg: "bg-green-500/20",  text: "text-green-400",  border: "border-green-500/30" },
  long:      { bg: "bg-green-500/20",  text: "text-green-400",  border: "border-green-500/30" },
  tempo:     { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
  sweet_spot:{ bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
  threshold: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
  interval:  { bg: "bg-red-500/20",    text: "text-red-400",    border: "border-red-500/30" },
  vo2max:    { bg: "bg-red-500/20",    text: "text-red-400",    border: "border-red-500/30" },
  race:      { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  hard:      { bg: "bg-red-500/20",    text: "text-red-400",    border: "border-red-500/30" },
};

const ZONE_COLORS = ["#3B82F6", "#22C55E", "#EAB308", "#F97316", "#EF4444"];
const ZONE_LABELS = ["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5"];

interface SessionPopupProps {
  session: Session | PlannedSession;
  sessionType: "completed" | "planned";
  athleteId: string;
  onClose: () => void;
}

export default function SessionPopup({ session, sessionType, athleteId: propAthleteId, onClose }: SessionPopupProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const storeAthleteId = useAthleteStore((s) => s.selectedAthleteId);
  const athleteId = propAthleteId || storeAthleteId || "";

  const sessionId = sessionType === "completed" ? String((session as Session).id) : null;
  const { data: detail } = useSessionDetail(athleteId, sessionId);
  const { data: timeSeries } = useSessionTimeSeries(athleteId, sessionId);

  // Build chart data from timeseries
  const chartData = useMemo(() => {
    if (!timeSeries?.points || timeSeries.points.length === 0) return [];
    let elapsed = 0;
    return timeSeries.points.map((p: any, i: number) => {
      if (i > 0 && timeSeries.points[i - 1]) {
        const prev = new Date(timeSeries.points[i - 1].timestamp).getTime();
        const curr = new Date(p.timestamp).getTime();
        elapsed += (curr - prev) / 1000;
      }
      return {
        min: Math.round(elapsed / 60),
        hr: p.hr,
        power: p.power,
        speed: p.speed,
        cadence: p.cadence,
      };
    });
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
    const hasPower = s.sport === "bike" && s.avgPower != null;
    const hasSpeed = chartData.some((d) => d.speed != null && d.speed > 0);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div className="relative mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ backgroundColor: sportColor }}>
              <SportIcon sport={s.sport} size={20} />
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold text-foreground">{s.title}</div>
              <div className="text-sm text-muted-foreground">
                {format(parseISO(s.startedAt), "EEEE d. MMMM yyyy 'kl.' HH:mm")}
              </div>
            </div>
            {/* Session type badge — prominent */}
            <div className={`rounded-lg border px-3 py-1.5 ${typeColors.bg} ${typeColors.border}`}>
              <span className={`text-sm font-bold ${typeColors.text}`}>
                {SESSION_TYPE_LABELS[s.sessionType] || s.sessionType}
              </span>
            </div>
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

          {/* 3 charts grid — matching IronCoach: HR, Power, Pace/Speed */}
          {chartData.length > 10 && (
            <div className={`mb-5 grid gap-4 ${
              hasPower && hasSpeed ? "grid-cols-3" : hasPower || hasSpeed ? "grid-cols-2" : "grid-cols-1"
            }`}>
              {/* Chart 1: Heart Rate */}
              {chartData.some((d) => d.hr != null) && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Heart className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Puls</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      Gns. {s.avgHr ?? "–"} · Max {s.maxHr ?? "–"} bpm
                    </span>
                  </div>
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="min" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `${v}m`} />
                        <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} width={28} domain={["dataMin - 10", "dataMax + 10"]} />
                        <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "10px" }} formatter={(v: number) => [`${v} bpm`, "Puls"]} />
                        <Area dataKey="hr" stroke="#EF4444" fill="#EF444420" strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Chart 2: Power (only for bike) */}
              {hasPower && chartData.some((d) => d.power != null) && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Zap className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Watt</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      Gns. {s.avgPower ?? "–"} · NP {s.normalizedPower ?? "–"} W
                    </span>
                  </div>
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="min" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `${v}m`} />
                        <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} width={28} domain={["dataMin - 20", "dataMax + 20"]} />
                        <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "10px" }} formatter={(v: number) => [`${v}W`, "Power"]} />
                        <Area dataKey="power" stroke="#EAB308" fill="#EAB30820" strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Chart 3: Pace (run/swim) or Speed (bike) */}
              {hasSpeed && chartData.some((d) => d.speed != null && d.speed > 0) && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {s.sport === "bike" ? "Hastighed" : "Pace"}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {s.sport === "bike"
                        ? `Gns. ${s.avgPace ? Math.round(s.distanceMeters! / s.durationSeconds * 3.6) : "–"} km/t`
                        : `Gns. ${s.avgPace ? `${Math.floor(s.avgPace / 60)}:${String(Math.round(s.avgPace % 60)).padStart(2, "0")}/km` : "–"}`
                      }
                    </span>
                  </div>
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData.map((d) => ({
                          ...d,
                          paceOrSpeed: d.speed && d.speed > 0
                            ? s.sport === "bike"
                              ? Math.round(d.speed * 3.6 * 10) / 10  // km/h
                              : Math.round((1000 / d.speed / 60) * 100) / 100  // min/km
                            : null,
                        }))}
                        margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="min" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `${v}m`} />
                        <YAxis
                          tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                          width={32}
                          reversed={s.sport !== "bike"}
                          domain={s.sport === "bike" ? ["dataMin - 5", "dataMax + 5"] : undefined}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "10px" }}
                          formatter={(v: number) => [
                            s.sport === "bike" ? `${v} km/t` : `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, "0")}/km`,
                            s.sport === "bike" ? "Hastighed" : "Pace",
                          ]}
                        />
                        <Area dataKey="paceOrSpeed" stroke="#3B82F6" fill="#3B82F620" strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

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
