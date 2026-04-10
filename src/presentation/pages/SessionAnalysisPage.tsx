import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAthleteStore } from "@/application/stores/athleteStore";
import SessionEquipmentSection from "@/presentation/components/equipment/SessionEquipmentSection";
import { useSessionDetail, useSessionTimeSeries } from "@/application/hooks/training/useSessions";
import { useAthleteProfile } from "@/application/hooks/athlete/useAthleteProfile";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { formatDuration, formatDistance } from "@/domain/utils/formatters";
import { apiClient } from "@/application/api/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  ArrowLeft, Heart, Zap, TrendingUp, TrendingDown, Minus, Clock, Activity, Mountain, Pencil,
  ChevronDown, ChevronUp, Info,
} from "lucide-react";

// IronCoach exact zone colors
const ZONE_COLORS = ["#3A7BFF", "#28CF59", "#F6D74A", "#F57C00", "#D32F2F"];
const ZONE_LABELS = ["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5"];

const SESSION_TYPE_LABELS: Record<string, string> = {
  recovery: "Restitution", endurance: "Udholdenhed", tempo: "Tempo",
  sweet_spot: "Sweet Spot", threshold: "Threshold", vo2max: "VO2Max",
  anaerobic: "Anaerobic",
};

const SESSION_TYPE_COLORS: Record<string, string> = {
  recovery:   "bg-blue-500/20 text-blue-400 border-blue-500/30",
  endurance:  "bg-green-500/20 text-green-400 border-green-500/30",
  tempo:      "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  sweet_spot: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  threshold:  "bg-orange-500/20 text-orange-400 border-orange-500/30",
  vo2max:     "bg-red-500/20 text-red-400 border-red-500/30",
  anaerobic:  "bg-red-500/20 text-red-400 border-red-500/30",
};

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h${m % 60 > 0 ? (m % 60) + "m" : ""}`;
}

function getHrZone(hr: number | null, lthrVal: number | null): { zone: number; label: string; color: string } | null {
  if (!hr || !lthrVal) return null;
  const pct = hr / lthrVal;
  if (pct < 0.81) return { zone: 1, label: "Z1", color: "#3A7BFF" };
  if (pct < 0.90) return { zone: 2, label: "Z2", color: "#28CF59" };
  if (pct < 0.94) return { zone: 3, label: "Z3", color: "#F6D74A" };
  if (pct < 1.00) return { zone: 4, label: "Z4", color: "#F57C00" };
  return { zone: 5, label: "Z5", color: "#D32F2F" };
}

function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

export default function SessionAnalysisPage({ sessionIdProp }: { sessionIdProp?: string } = {}) {
  const params = useParams<{ sessionId: string }>();
  const sessionId = sessionIdProp || params.sessionId;
  const navigate = useNavigate();
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const queryClient = useQueryClient();

  const { data: detail, isLoading } = useSessionDetail(athleteId, sessionId ?? null);
  const { data: timeSeries } = useSessionTimeSeries(athleteId, sessionId ?? null);
  const { data: profileData } = useAthleteProfile(athleteId);
  const profile = profileData?.data ?? (profileData as any);

  const [tsMode, setTsMode] = useState<"power" | "pace" | "cadence" | "altitude">("power");
  const [editingType, setEditingType] = useState(false);

  const session = detail?.session;
  const analytics = detail?.analytics;
  const laps = detail?.laps ?? [];

  // Build chart data
  const chartData = useMemo(() => {
    if (!timeSeries?.points || timeSeries.points.length === 0) return [];
    let elapsed = 0;
    const raw = timeSeries.points.map((p: any, i: number) => {
      if (i > 0 && timeSeries.points[i - 1]) {
        const prev = new Date(timeSeries.points[i - 1].timestamp).getTime();
        const curr = new Date(p.timestamp).getTime();
        elapsed += (curr - prev) / 1000;
      }
      return { sec: elapsed, hr: p.hr, power: p.power, speed: p.speed, cadence: p.cadence, altitude: p.altitude };
    });
    // Downsample to ~150 points
    if (raw.length <= 150) return raw;
    const step = Math.ceil(raw.length / 150);
    const result: any[] = [];
    for (let i = 0; i < raw.length; i += step) {
      const chunk = raw.slice(i, Math.min(i + step, raw.length));
      const avg = (arr: any[], key: string) => { const vals = arr.filter(c => c[key] != null); return vals.length ? vals.reduce((s, c) => s + c[key], 0) / vals.length : null; };
      result.push({ sec: chunk[0].sec, hr: Math.round(avg(chunk, "hr") ?? 0) || null, power: Math.round(avg(chunk, "power") ?? 0) || null, speed: avg(chunk, "speed"), cadence: Math.round(avg(chunk, "cadence") ?? 0) || null, altitude: avg(chunk, "altitude") });
    }
    return result;
  }, [timeSeries]);

  // Zone data
  const zoneData = useMemo(() => {
    if (!analytics) return null;
    const secs = [analytics.zone1Seconds ?? 0, analytics.zone2Seconds ?? 0, analytics.zone3Seconds ?? 0, analytics.zone4Seconds ?? 0, analytics.zone5Seconds ?? 0];
    const total = secs.reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    return secs.map((s, i) => ({ zone: ZONE_LABELS[i], seconds: s, pct: Math.round((s / total) * 100), minutes: Math.round(s / 60 * 10) / 10, fill: ZONE_COLORS[i] }));
  }, [analytics]);

  // Lap analysis
  const lapAnalysis = useMemo(() => {
    if (!laps || laps.length === 0) return null;
    const avgPower = laps.filter(l => l.avgPower).reduce((s, l) => s + (l.avgPower ?? 0), 0) / (laps.filter(l => l.avgPower).length || 1);
    const avgPace = laps.filter(l => l.avgPace).reduce((s, l) => s + (l.avgPace ?? 0), 0) / (laps.filter(l => l.avgPace).length || 1);
    const deviations = laps.map(l => {
      const ref = session?.sport === "bike" ? avgPower : avgPace;
      const val = session?.sport === "bike" ? (l.avgPower ?? 0) : (l.avgPace ?? 0);
      return ref > 0 ? Math.round(((val - ref) / ref) * 1000) / 10 : 0;
    });
    const consistency = deviations.length > 0 ? Math.max(0, 100 - deviations.reduce((s, d) => s + Math.abs(d), 0) / deviations.length * 10) : 0;
    // Falloff: first vs last non-rest lap
    const nonRest = laps.filter(l => l.durationSeconds > 60);
    const falloff = nonRest.length >= 2 ? (() => {
      const first = session?.sport === "bike" ? (nonRest[0].avgPower ?? 0) : (nonRest[0].avgPace ?? 0);
      const last = session?.sport === "bike" ? (nonRest[nonRest.length - 1].avgPower ?? 0) : (nonRest[nonRest.length - 1].avgPace ?? 0);
      return first > 0 ? Math.round(((last - first) / first) * 1000) / 10 : 0;
    })() : 0;

    return { avgPower: Math.round(avgPower), avgPace, deviations, consistency: Math.round(consistency), falloff };
  }, [laps, session]);

  // Decoupling
  const decoupling = analytics?.decoupling;
  const ef = analytics?.efficiencyFactor;

  if (!athleteId || !sessionId) {
    return <div className="p-6 text-muted-foreground">Ingen session valgt.</div>;
  }

  if (isLoading || !session) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-6 gap-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const sportColor = getSportColor(session.sport);
  const typeColors = SESSION_TYPE_COLORS[session.sessionType] ?? "bg-muted text-foreground border-border";
  const ftp = profile?.ftp;
  const lthr = profile?.lthr;

  const handleTypeChange = async (newType: string) => {
    await apiClient.patch(`/training/sessions/${athleteId}/${session.id}`, { sessionType: newType }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["session-detail"] });
    setEditingType(false);
  };

  return (
    <div data-testid="session-analysis-page" className="space-y-6 p-4 md:p-6">
      {/* Back button + title */}
      <div className="flex items-center gap-4">
        {!sessionIdProp && <button onClick={() => navigate(-1)} className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted"><ArrowLeft size={20} /></button>}
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ backgroundColor: sportColor }}>
            <SportIcon sport={session.sport} size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{session.title}</div>
            <div className="text-sm text-muted-foreground">
              {new Date(session.startedAt).toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {" kl. "}{new Date(session.startedAt).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}
              <span className="ml-2 text-[10px] text-muted-foreground/50">ID: {session.id}</span>
            </div>
          </div>
        </div>
        {/* Session type badge — editable */}
        {editingType ? (
          <select autoFocus value={session.sessionType} onChange={(e) => handleTypeChange(e.target.value)} onBlur={() => setEditingType(false)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-bold">
            {Object.entries(SESSION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        ) : (
          <button onClick={() => setEditingType(true)} className={`group flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ${typeColors}`}>
            <span className="text-sm font-bold">{SESSION_TYPE_LABELS[session.sessionType] || session.sessionType}</span>
            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100" />
          </button>
        )}
      </div>

      {/* ═══ SEKTION 1: Metrics Header ═══ */}
      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-[10px] text-muted-foreground">TSS</div>
          <div className="text-2xl font-bold text-foreground">{session.tss != null ? Math.round(session.tss) : "–"}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-[10px] text-muted-foreground">IF</div>
          <div className="text-2xl font-bold text-foreground">{analytics?.intensityFactor?.toFixed(2) ?? (ftp && session.avgPower ? (session.avgPower / ftp).toFixed(2) : "–")}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-[10px] text-muted-foreground">Varighed</div>
          <div className="text-2xl font-bold text-foreground">{formatDuration(session.durationSeconds)}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-[10px] text-muted-foreground">Distance</div>
          <div className="text-2xl font-bold text-foreground">{session.distanceMeters ? formatDistance(session.distanceMeters) : "–"}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-[10px] text-muted-foreground">Gns. HR</div>
          <div className="text-2xl font-bold text-foreground">{session.avgHr ?? "–"}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-[10px] text-muted-foreground">{session.sport === "bike" ? "NP" : session.sport === "swim" ? "CSS" : "Pace"}</div>
          <div className="text-2xl font-bold text-foreground">
            {session.sport === "bike" ? (session.normalizedPower ?? "–") :
             session.avgPace ? fmtPace(session.avgPace) : "–"}
          </div>
          {session.sport === "bike" && <div className="text-[9px] text-muted-foreground">W</div>}
        </div>
      </div>

      {/* ═══ SEKTION 2: Zonefordeling ═══ */}
      {zoneData && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {session.sport === "bike" ? "Effektzoner" : session.sport === "swim" ? "Intensitetszoner" : "Pulszoner"}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v} min`} />
                <YAxis type="category" dataKey="zone" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={50} />
                <Tooltip cursor={false} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" }} formatter={(v: number, _: any, props: any) => [`${v} min (${props.payload.pct}%)`, props.payload.zone]} />
                <Bar dataKey="minutes" radius={[0, 4, 4, 0]} activeBar={{ fillOpacity: 0.7, stroke: "hsl(var(--foreground))", strokeWidth: 1 }}>
                  {zoneData.map((z, i) => <Cell key={i} fill={z.fill} />)}
                </Bar>
                {ftp && session.sport === "bike" && <ReferenceLine x={session.durationSeconds / 60 * 0.75} stroke="#EAB308" strokeDasharray="4 2" label={{ value: "FTP ref", fill: "#EAB308", fontSize: 9 }} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══ SEKTION 3: Tidsserie med mode-toggles ═══ */}
      {chartData.length > 5 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Tidsserie</h3>
            <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5">
              {([
                { key: "power", icon: <Zap size={12} />, label: "Effekt" },
                { key: "pace", icon: <TrendingUp size={12} />, label: "Pace" },
                { key: "cadence", icon: <Activity size={12} />, label: "Kadence" },
                { key: "altitude", icon: <Mountain size={12} />, label: "Hoejde" },
              ] as const).map(({ key, icon, label }) => (
                <button key={key} onClick={() => setTsMode(key)} className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-medium ${tsMode === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tsMode === "pace" ? chartData.map(d => ({ ...d, paceMinKm: d.speed && d.speed > 0 ? (1000 / d.speed / 60) : null })) : chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="tsGrad1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={tsMode === "power" ? "#EAB308" : tsMode === "pace" ? "#3B82F6" : tsMode === "cadence" ? "#22C55E" : "#8B5CF6"} stopOpacity={0.3} /><stop offset="95%" stopColor={tsMode === "power" ? "#EAB308" : tsMode === "pace" ? "#3B82F6" : tsMode === "cadence" ? "#22C55E" : "#8B5CF6"} stopOpacity={0} /></linearGradient>
                  <linearGradient id="tsGradHr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="sec" tickFormatter={fmtTime} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" minTickGap={30} />
                <YAxis yAxisId="main" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={40} reversed={tsMode === "pace"} />
                {(tsMode === "power" || tsMode === "pace") && <YAxis yAxisId="hr" orientation="right" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={35} />}
                <Tooltip cursor={false} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11, color: "hsl(var(--foreground))" }} labelFormatter={fmtTime} />

                {tsMode === "power" && <>
                  <Area yAxisId="main" type="monotone" dataKey="power" stroke="#EAB308" strokeWidth={1.5} fill="url(#tsGrad1)" connectNulls name="Power (W)" />
                  <Area yAxisId="hr" type="monotone" dataKey="hr" stroke="#EF4444" strokeWidth={1} fill="url(#tsGradHr)" connectNulls name="HR (bpm)" />
                  {ftp && <ReferenceLine yAxisId="main" y={ftp} stroke="#22c55e" strokeDasharray="3 3" label={{ value: `FTP ${ftp}`, fill: "#22c55e", fontSize: 9, position: "insideTopRight" }} />}
                  {lthr && <ReferenceLine yAxisId="hr" y={lthr} stroke="#f97316" strokeDasharray="3 3" label={{ value: `LTHR ${lthr}`, fill: "#f97316", fontSize: 9, position: "insideBottomRight" }} />}
                </>}
                {tsMode === "pace" && <>
                  <Area yAxisId="main" type="monotone" dataKey="paceMinKm" stroke="#3B82F6" strokeWidth={1.5} fill="url(#tsGrad1)" connectNulls name="Pace (min/km)" />
                  <Area yAxisId="hr" type="monotone" dataKey="hr" stroke="#EF4444" strokeWidth={1} fill="url(#tsGradHr)" connectNulls name="HR (bpm)" />
                </>}
                {tsMode === "cadence" && <Area yAxisId="main" type="monotone" dataKey="cadence" stroke="#22C55E" strokeWidth={1.5} fill="url(#tsGrad1)" connectNulls name="Kadence" />}
                {tsMode === "altitude" && <Area yAxisId="main" type="monotone" dataKey="altitude" stroke="#8B5CF6" strokeWidth={1.5} fill="url(#tsGrad1)" connectNulls name="Hoejde (m)" />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══ SEKTION 4: Decoupling Card ═══ */}
      {decoupling != null && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-foreground">Aerob Afkobling ({session.sport === "bike" ? "Pw:HR" : "Pa:HR"})</h3>
            <div className="group relative">
              <Info size={14} className="text-muted-foreground cursor-help" />
              <div className="absolute left-0 top-6 z-20 hidden w-64 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground shadow-xl group-hover:block">
                Maaler aerob effektivitet over traeningens varighed. Beregnes som EF-forskellen mellem foerste og anden halvdel. Under 5% = god aerob kapacitet.
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">EF (samlet)</div>
              <div className="text-xl font-bold text-foreground">{ef?.toFixed(2) ?? "–"}</div>
              <div className="text-[9px] text-muted-foreground">{session.sport === "bike" ? "NP/HR" : "Pace/HR"}</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">1. halvdel EF</div>
              <div className="text-xl font-bold text-foreground">{ef ? (ef * (1 + (decoupling ?? 0) / 200)).toFixed(2) : "–"}</div>
              <div className="text-[9px] text-muted-foreground">estimat</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">2. halvdel EF</div>
              <div className="text-xl font-bold text-foreground">{ef ? (ef * (1 - (decoupling ?? 0) / 200)).toFixed(2) : "–"}</div>
              <div className="text-[9px] text-muted-foreground">estimat</div>
            </div>
            <div className={`rounded-lg p-3 text-center ${decoupling < 5 ? "bg-green-500/10" : decoupling < 8 ? "bg-amber-500/10" : "bg-red-500/10"}`}>
              <div className="text-xs text-muted-foreground">Afkobling</div>
              <div className={`text-xl font-bold ${decoupling < 5 ? "text-green-400" : decoupling < 8 ? "text-amber-400" : "text-red-400"}`}>{decoupling.toFixed(1)}%</div>
              <div className="text-[9px] text-muted-foreground">{decoupling < 5 ? "God aerob kapacitet" : decoupling < 8 ? "Acceptabel" : "Behoever mere Z2"}</div>
            </div>
          </div>
          {/* Interpretation */}
          <div className={`mt-3 rounded-lg border p-3 text-xs ${decoupling < 5 ? "border-green-500/30 bg-green-500/5 text-green-400" : decoupling < 8 ? "border-amber-500/30 bg-amber-500/5 text-amber-400" : "border-red-500/30 bg-red-500/5 text-red-400"}`}>
            {decoupling < 5 ? (
              <p><strong>God aerob kapacitet.</strong> EF-driften er under 5%, hvilket indikerer at din aerobe base er staerk nok til denne intensitet og varighed.</p>
            ) : decoupling < 8 ? (
              <p><strong>Acceptabel afkobling.</strong> EF-driften er 5-8%. Din aerobe kapacitet er tilstraekkelig, men mere Zone 2-arbejde vil forbedre effektiviteten.</p>
            ) : (
              <p><strong>Hoej afkobling — behoever mere Zone 2.</strong> EF-driften er over 8%, hvilket tyder paa at din aerobe base ikke er staerk nok til denne intensitet. Fokuser paa laengere Zone 2-traening.</p>
            )}
          </div>
          {/* EF tooltip */}
          <div className="mt-2 text-[10px] text-muted-foreground">
            <strong>Efficiency Factor (EF)</strong> = {session.sport === "bike" ? "Normaliseret Power / Gns. HR" : "Pace / Gns. HR"}. Hoejere EF ved samme intensitet = forbedret aerob kapacitet over tid.
          </div>
        </div>
      )}

      {/* ═══ SEKTION 5: Lap-analyse ═══ */}
      {laps.length > 0 && lapAnalysis && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Omgangsanalyse</h3>

          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">Konsistens</div>
              <div className={`text-xl font-bold ${lapAnalysis.consistency >= 90 ? "text-green-400" : lapAnalysis.consistency >= 80 ? "text-yellow-400" : "text-orange-400"}`}>{lapAnalysis.consistency}%</div>
              <div className="text-[9px] text-muted-foreground">{lapAnalysis.consistency >= 90 ? "Meget konsistent" : lapAnalysis.consistency >= 80 ? "God konsistens" : "Godt interval-arbejde"}</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">Gns. {session.sport === "bike" ? "Watt" : "Pace"}</div>
              <div className="text-xl font-bold text-foreground">{session.sport === "bike" ? lapAnalysis.avgPower : fmtPace(lapAnalysis.avgPace)}</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">Gns. IF</div>
              <div className="text-xl font-bold text-foreground">{ftp && lapAnalysis.avgPower ? (lapAnalysis.avgPower / ftp).toFixed(2) : "–"}</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">{session.sport === "bike" ? "Effektfald" : "Pacefald"}</div>
              <div className={`text-xl font-bold ${lapAnalysis.falloff > -5 ? "text-green-400" : lapAnalysis.falloff > 0 ? "text-yellow-400" : "text-red-400"}`}>{lapAnalysis.falloff > 0 ? "+" : ""}{lapAnalysis.falloff}%</div>
            </div>
          </div>

          {/* Lap table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-2">#</th>
                  <th className="p-2">Varighed</th>
                  <th className="p-2">Distance</th>
                  {session.sport === "bike" ? <th className="p-2">Watt</th> : <th className="p-2">Pace</th>}
                  <th className="p-2">HR</th>
                  {laps.some(l => l.avgCadence) && <th className="p-2">Kad.</th>}
                  <th className="p-2">Afvigelse</th>
                </tr>
              </thead>
              <tbody>
                {laps.map((lap, i) => {
                  const dev = lapAnalysis.deviations[i] ?? 0;
                  const isRest = lap.durationSeconds < 60;
                  return (
                    <tr key={i} className={`border-b border-border/30 ${isRest ? "opacity-40" : ""}`}>
                      <td className="p-2 font-medium text-foreground">{lap.lapNumber}{isRest && <span className="ml-1 text-[9px] text-muted-foreground">rest</span>}</td>
                      <td className="p-2 text-foreground">{formatDuration(lap.durationSeconds)}</td>
                      <td className="p-2 text-foreground">{lap.distanceMeters ? formatDistance(lap.distanceMeters) : "–"}</td>
                      {session.sport === "bike" ? <td className="p-2 text-foreground">{lap.avgPower ?? "–"}W</td> : <td className="p-2 text-foreground">{lap.avgPace ? fmtPace(lap.avgPace) : "–"}</td>}
                      <td className="p-2">
                        {(() => {
                          const z = getHrZone(lap.avgHr, lthr);
                          if (!lap.avgHr) return <span className="text-foreground">–</span>;
                          return (
                            <span className="flex items-center gap-1">
                              <span className="text-foreground">{lap.avgHr}</span>
                              {z && <span className="rounded px-1 py-0 text-[9px] font-bold text-white" style={{ backgroundColor: z.color }}>{z.label}</span>}
                            </span>
                          );
                        })()}
                      </td>
                      {laps.some(l => l.avgCadence) && <td className="p-2 text-foreground">{lap.avgCadence ?? "–"}</td>}
                      <td className="p-2">
                        {!isRest && (
                          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            Math.abs(dev) < 3 ? "bg-green-500/15 text-green-400" :
                            Math.abs(dev) < 6 ? "bg-yellow-500/15 text-yellow-400" :
                            "bg-red-500/15 text-red-400"
                          }`}>
                            {dev > 0 ? <TrendingUp className="h-3 w-3" /> : dev < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {dev > 0 ? "+" : ""}{dev}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" /> &lt;3% afvigelse</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> 3-6% afvigelse</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> &gt;6% afvigelse</span>
            <span className="ml-auto">{lapAnalysis.consistency >= 90 ? "Konsistens ≥90% = godt jævnt arbejde" : "Konsistens <90% = godt interval-arbejde"}</span>
          </div>
        </div>
      )}

      {/* Session Equipment */}
      {athleteId && session.id && (
        <SessionEquipmentSection
          sessionId={session.id}
          athleteId={athleteId}
          sport={session.sport}
          totalDistanceM={session.distanceMeters}
          totalDurationMin={session.durationSeconds ? session.durationSeconds / 60 : undefined}
          laps={laps.map((l: any, i: number) => ({
            lapIndex: i + 1,
            distanceM: l.distanceMeters ?? null,
            durationSec: l.durationSeconds ?? 0,
            lapType: l.lapType ?? null,
            avgPowerW: l.avgPower ?? null,
            avgHr: l.avgHr ?? null,
          }))}
        />
      )}
    </div>
  );
}
