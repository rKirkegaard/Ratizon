import { useState } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useSessions } from "@/application/hooks/training/useSessions";
import { useSessionDetail, useSessionTimeSeries } from "@/application/hooks/training/useSessions";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { formatDuration, formatDistance } from "@/domain/utils/formatters";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";
import { Heart, Zap, TrendingUp, Clock, Activity, ArrowRight } from "lucide-react";
import type { Session } from "@/domain/types/training.types";

const ZONE_COLORS = ["#3B82F6", "#22C55E", "#EAB308", "#F97316", "#EF4444"];

function MiniChart({ data, dataKey, color, height = 60 }: { data: any[]; dataKey: string; color: string; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: -20, bottom: -4 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} fill={`url(#grad-${dataKey})`} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KPICard({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${color || "text-foreground"}`}>{value}</div>
      {unit && <div className="text-[9px] text-muted-foreground">{unit}</div>}
    </div>
  );
}

function ZoneBar({ zones }: { zones: number[] }) {
  const total = zones.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return (
    <div className="flex h-5 w-full overflow-hidden rounded-lg">
      {zones.map((z, i) => z > 0 && (
        <div key={i} className="flex items-center justify-center text-[8px] font-bold text-white" style={{ width: `${(z / total) * 100}%`, backgroundColor: ZONE_COLORS[i] }}>
          {(z / total) * 100 >= 10 ? `${Math.round((z / total) * 100)}%` : ""}
        </div>
      ))}
    </div>
  );
}

function ZoneDonut({ zones }: { zones: number[] }) {
  const total = zones.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const data = zones.map((v, i) => ({ name: `Z${i + 1}`, value: v, fill: ZONE_COLORS[i] }));
  return (
    <div className="h-24 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={25} outerRadius={40} stroke="none">
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Variant Components ──────────────────────────────────────────────

function Variant1({ session, chartData, zones }: { session: Session; chartData: any[]; zones: number[] }) {
  return (
    <div className="rounded-lg border-2 border-blue-500/30 bg-card p-4">
      <div className="mb-2 text-xs font-bold text-blue-400">VARIANT 1: Kompakt Dashboard — alt i ét viewport</div>
      <div className="grid grid-cols-6 gap-2 mb-3">
        <KPICard label="TSS" value={Math.round(session.tss ?? 0)} />
        <KPICard label="Varighed" value={formatDuration(session.durationSeconds)} />
        <KPICard label="Distance" value={formatDistance(session.distanceMeters)} />
        <KPICard label="Gns. HR" value={session.avgHr ?? "–"} unit="bpm" />
        <KPICard label="Effekt" value={session.avgPower ?? "–"} unit="W" />
        <KPICard label="Pace" value={session.avgPace ? `${Math.floor(session.avgPace / 60)}:${String(Math.round(session.avgPace % 60)).padStart(2, "0")}` : "–"} unit="/km" />
      </div>
      <div className="grid grid-cols-[1fr_100px] gap-3">
        <MiniChart data={chartData} dataKey="hr" color="#EF4444" height={80} />
        <ZoneDonut zones={zones} />
      </div>
    </div>
  );
}

function Variant2({ session, chartData, zones }: { session: Session; chartData: any[]; zones: number[] }) {
  return (
    <div className="rounded-lg border-2 border-green-500/30 bg-card p-4">
      <div className="mb-2 text-xs font-bold text-green-400">VARIANT 2: Stacked Scroll — sticky header, stablede grafer</div>
      <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-sm rounded-md px-3 py-2 mb-3 flex gap-4 text-xs border border-border/30">
        <span className="font-bold text-foreground">{session.title}</span>
        <span className="text-muted-foreground">TSS {Math.round(session.tss ?? 0)}</span>
        <span className="text-muted-foreground">{formatDuration(session.durationSeconds)}</span>
        <span className="text-muted-foreground">{formatDistance(session.distanceMeters)}</span>
        <span className="ml-auto text-primary cursor-pointer">Sammenlign →</span>
      </div>
      <div className="space-y-2">
        <div className="rounded bg-muted/20 p-2">
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1"><Heart className="h-3 w-3 text-red-500" /> Puls</div>
          <MiniChart data={chartData} dataKey="hr" color="#EF4444" height={60} />
        </div>
        <div className="rounded bg-muted/20 p-2">
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1"><Zap className="h-3 w-3 text-yellow-500" /> Watt</div>
          <MiniChart data={chartData} dataKey="power" color="#EAB308" height={60} />
        </div>
        <div className="rounded bg-muted/20 p-2">
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1"><TrendingUp className="h-3 w-3 text-blue-500" /> Pace</div>
          <MiniChart data={chartData} dataKey="speed" color="#3B82F6" height={60} />
        </div>
        <ZoneBar zones={zones} />
      </div>
    </div>
  );
}

function Variant3({ session, chartData, zones }: { session: Session; chartData: any[]; zones: number[] }) {
  return (
    <div className="rounded-lg border-2 border-orange-500/30 bg-card p-4">
      <div className="mb-2 text-xs font-bold text-orange-400">VARIANT 3: Split Panel — graf venstre, data hoejre (ANBEFALET)</div>
      <div className="grid grid-cols-[3fr_2fr] gap-4">
        {/* Left: Charts */}
        <div className="space-y-2">
          <div className="rounded bg-muted/20 p-2">
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1"><Heart className="h-3 w-3 text-red-500" /> Puls · <span className="text-foreground font-medium">{session.avgHr ?? "–"}</span> gns</div>
            <MiniChart data={chartData} dataKey="hr" color="#EF4444" height={70} />
          </div>
          <div className="rounded bg-muted/20 p-2">
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1"><Zap className="h-3 w-3 text-yellow-500" /> Watt · <span className="text-foreground font-medium">{session.avgPower ?? "–"}</span> gns</div>
            <MiniChart data={chartData} dataKey="power" color="#EAB308" height={70} />
          </div>
          <div className="rounded bg-muted/20 p-2">
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1"><TrendingUp className="h-3 w-3 text-blue-500" /> Hastighed</div>
            <MiniChart data={chartData} dataKey="speed" color="#3B82F6" height={70} />
          </div>
        </div>

        {/* Right: Context */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <KPICard label="TSS" value={Math.round(session.tss ?? 0)} />
            <KPICard label="Varighed" value={formatDuration(session.durationSeconds)} />
            <KPICard label="Distance" value={formatDistance(session.distanceMeters)} />
            <KPICard label="Stigning" value={session.elevationGain ? `${Math.round(session.elevationGain)}m` : "–"} />
          </div>
          <div>
            <div className="text-[9px] text-muted-foreground mb-1">Zonefordeling</div>
            <ZoneBar zones={zones} />
          </div>
          <div className="text-[10px] space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Kadence</span><span className="text-foreground">{session.avgCadence ?? "–"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Max HR</span><span className="text-foreground">{session.maxHr ?? "–"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">NP</span><span className="text-foreground">{session.normalizedPower ?? "–"}</span></div>
          </div>
          <button className="w-full flex items-center justify-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20">
            Sammenlign med... <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Variant4({ session, chartData, zones }: { session: Session; chartData: any[]; zones: number[] }) {
  const [tab, setTab] = useState<"overblik" | "grafer" | "omgange" | "analyse">("overblik");
  return (
    <div className="rounded-lg border-2 border-purple-500/30 bg-card p-4">
      <div className="mb-2 text-xs font-bold text-purple-400">VARIANT 4: Tab Workbench — faner for hver sektion</div>
      <div className="flex gap-1 rounded-lg bg-muted/30 p-1 mb-3">
        {(["overblik", "grafer", "omgange", "analyse"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1 text-xs font-medium capitalize ${tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      {tab === "overblik" && (
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <MiniChart data={chartData} dataKey="hr" color="#EF4444" height={100} />
          </div>
          <div className="space-y-2">
            <KPICard label="TSS" value={Math.round(session.tss ?? 0)} />
            <KPICard label="Varighed" value={formatDuration(session.durationSeconds)} />
            <ZoneDonut zones={zones} />
          </div>
        </div>
      )}
      {tab === "grafer" && (
        <div className="space-y-2">
          <MiniChart data={chartData} dataKey="hr" color="#EF4444" height={80} />
          <MiniChart data={chartData} dataKey="power" color="#EAB308" height={80} />
          <MiniChart data={chartData} dataKey="speed" color="#3B82F6" height={80} />
        </div>
      )}
      {tab === "omgange" && (
        <div className="text-sm text-muted-foreground text-center py-8">Omgangs-tabel vises her (per-lap metrics + mini-grafer)</div>
      )}
      {tab === "analyse" && (
        <div className="text-sm text-muted-foreground text-center py-8">Dyb analyse: EF-trend, decoupling, HR-drift, sammenligning</div>
      )}
    </div>
  );
}

function Variant5({ session, chartData, zones }: { session: Session; chartData: any[]; zones: number[] }) {
  return (
    <div className="rounded-lg border-2 border-red-500/30 bg-card p-4">
      <div className="mb-2 text-xs font-bold text-red-400">VARIANT 5: Deep Analysis Workbench — tre zoner, resizable</div>
      {/* Top: KPI rail */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {[
          { l: "TSS", v: Math.round(session.tss ?? 0) },
          { l: "IF", v: session.normalizedPower && session.avgPower ? (session.normalizedPower / 280).toFixed(2) : "–" },
          { l: "NP", v: session.normalizedPower ?? "–" },
          { l: "EF", v: "1.72" },
          { l: "Afkobling", v: "6.8%" },
          { l: "Varighed", v: formatDuration(session.durationSeconds) },
          { l: "Distance", v: formatDistance(session.distanceMeters) },
        ].map((k) => (
          <div key={k.l} className="flex-shrink-0 rounded bg-muted/30 px-3 py-1.5 text-center min-w-[70px]">
            <div className="text-[8px] text-muted-foreground">{k.l}</div>
            <div className="text-sm font-bold text-foreground">{k.v}</div>
          </div>
        ))}
      </div>
      {/* Middle: 2-column */}
      <div className="grid grid-cols-[2fr_1fr] gap-3 mb-3">
        <div className="space-y-1">
          <div className="rounded bg-muted/20 p-1.5"><MiniChart data={chartData} dataKey="hr" color="#EF4444" height={55} /></div>
          <div className="rounded bg-muted/20 p-1.5"><MiniChart data={chartData} dataKey="power" color="#EAB308" height={55} /></div>
        </div>
        <div className="space-y-2">
          <div><div className="text-[8px] text-muted-foreground mb-0.5">Zoner</div><ZoneBar zones={zones} /></div>
          <div className="text-[9px] space-y-0.5">
            <div className="flex justify-between"><span className="text-muted-foreground">Kadence</span><span>{session.avgCadence ?? "–"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Max HR</span><span>{session.maxHr ?? "–"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Stigning</span><span>{session.elevationGain ? `${Math.round(session.elevationGain)}m` : "–"}</span></div>
          </div>
          <button className="w-full text-[9px] text-primary border border-primary/30 rounded px-2 py-1">Drag session til sammenligning</button>
        </div>
      </div>
      {/* Bottom: detail table placeholder */}
      <div className="rounded bg-muted/10 border border-border/30 p-2 text-[9px] text-muted-foreground text-center">
        Omgangs-tabel (draggable panel) — klik omgang = brush-range i alle grafer
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function UXTestPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: sessionsData } = useSessions(athleteId, "30d");
  const sessions = sessionsData?.sessions ?? [];

  // Pick first session with data
  const session = sessions.find((s) => s.avgHr != null) ?? sessions[0];
  const sessionId = session ? String(session.id) : null;

  const { data: detail } = useSessionDetail(athleteId, sessionId);
  const { data: timeSeries } = useSessionTimeSeries(athleteId, sessionId);

  // Build chart data
  const chartData = (() => {
    if (!timeSeries?.points || timeSeries.points.length === 0) return [];
    let elapsed = 0;
    const raw = timeSeries.points.map((p: any, i: number) => {
      if (i > 0) {
        const prev = new Date(timeSeries.points[i - 1].timestamp).getTime();
        const curr = new Date(p.timestamp).getTime();
        elapsed += (curr - prev) / 1000;
      }
      return { sec: elapsed, hr: p.hr, power: p.power, speed: p.speed };
    });
    // Downsample
    if (raw.length <= 80) return raw;
    const step = Math.ceil(raw.length / 80);
    const result: any[] = [];
    for (let i = 0; i < raw.length; i += step) {
      const chunk = raw.slice(i, Math.min(i + step, raw.length));
      result.push({
        sec: chunk[0].sec,
        hr: Math.round(chunk.filter((c: any) => c.hr).reduce((s: number, c: any) => s + c.hr, 0) / (chunk.filter((c: any) => c.hr).length || 1)),
        power: Math.round(chunk.filter((c: any) => c.power).reduce((s: number, c: any) => s + c.power, 0) / (chunk.filter((c: any) => c.power).length || 1)),
        speed: chunk.filter((c: any) => c.speed).reduce((s: number, c: any) => s + c.speed, 0) / (chunk.filter((c: any) => c.speed).length || 1),
      });
    }
    return result;
  })();

  const zones = detail?.analytics
    ? [detail.analytics.zone1Seconds, detail.analytics.zone2Seconds, detail.analytics.zone3Seconds, detail.analytics.zone4Seconds, detail.analytics.zone5Seconds]
    : [0, 0, 0, 0, 0];

  if (!athleteId || !session) {
    return (
      <div data-testid="ux-test-page" className="p-4 md:p-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">UX Test Lab</h1>
        <p className="text-muted-foreground">Vaelg en atlet med traenigsdata for at se prototyper.</p>
      </div>
    );
  }

  return (
    <div data-testid="ux-test-page" className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">UX Test Lab</h1>
        <p className="text-sm text-muted-foreground mt-1">
          5 layout-varianter for dedikeret sessionsanalyse-side. Bruger data fra: <strong>{session.title}</strong> ({formatDuration(session.durationSeconds)})
        </p>
      </div>

      {chartData.length > 5 ? (
        <div className="space-y-6">
          <Variant1 session={session} chartData={chartData} zones={zones} />
          <Variant2 session={session} chartData={chartData} zones={zones} />
          <Variant3 session={session} chartData={chartData} zones={zones} />
          <Variant4 session={session} chartData={chartData} zones={zones} />
          <Variant5 session={session} chartData={chartData} zones={zones} />

          {/* Coaching expert recommendation */}
          <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-4">
            <h3 className="text-sm font-bold text-primary mb-2">Coaching-ekspertens anbefaling</h3>
            <p className="text-xs text-muted-foreground mb-3">
              <strong className="text-foreground">Variant 3 (Split Panel)</strong> anbefales som MVP. Det er den struktur erfarne coaches bruger i TrainingPeaks og WKO5: graf til venstre, kontekst til hoejre, brush-select der driver hoejre kolonne. Daekker 80% af analysebehovet uden tab-switching.
            </p>
            <div className="grid grid-cols-5 gap-2 text-[10px]">
              <div className="rounded bg-blue-500/10 border border-blue-500/20 p-2 text-center">
                <div className="font-bold text-blue-400">V1</div>
                <div className="text-muted-foreground">For kompakt</div>
              </div>
              <div className="rounded bg-green-500/10 border border-green-500/20 p-2 text-center">
                <div className="font-bold text-green-400">V2</div>
                <div className="text-muted-foreground">God mobil</div>
              </div>
              <div className="rounded bg-orange-500/10 border border-orange-500/30 p-2 text-center ring-2 ring-orange-500/50">
                <div className="font-bold text-orange-400">V3 ★</div>
                <div className="text-foreground font-medium">MVP</div>
              </div>
              <div className="rounded bg-purple-500/10 border border-purple-500/20 p-2 text-center">
                <div className="font-bold text-purple-400">V4</div>
                <div className="text-muted-foreground">Tab-skjuler</div>
              </div>
              <div className="rounded bg-red-500/10 border border-red-500/20 p-2 text-center">
                <div className="font-bold text-red-400">V5</div>
                <div className="text-muted-foreground">Post-MVP</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">Henter sessionsdata...</p>
        </div>
      )}
    </div>
  );
}
