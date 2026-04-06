import { useMemo } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { StatCard } from "@/presentation/components/shared/StatCard";
import { ZoneBar } from "@/presentation/components/shared/ZoneBar";
import {
  useSessionDetail,
  useSessionTimeSeries,
} from "@/application/hooks/training/useSessions";
import {
  formatDuration,
  formatDistance,
  formatPace,
} from "@/domain/utils/formatters";

interface SessionDetailProps {
  athleteId: string;
  sessionId: string;
}

const ZONE_COLORS = [
  "var(--zone-1)",
  "var(--zone-2)",
  "var(--zone-3)",
  "var(--zone-4)",
  "var(--zone-5)",
];

const ZONE_LABELS = ["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5"];

function DetailSkeleton() {
  return (
    <div data-testid="session-detail-skeleton" className="animate-pulse space-y-4">
      <div className="flex gap-2">
        <div className="h-8 w-20 rounded bg-muted" />
        <div className="h-8 w-20 rounded bg-muted" />
        <div className="h-8 w-20 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-48 rounded-lg bg-muted" />
    </div>
  );
}

export default function SessionDetail({ athleteId, sessionId }: SessionDetailProps) {
  const { data: detail, isLoading: detailLoading } = useSessionDetail(
    athleteId,
    sessionId
  );
  const { data: timeSeries } = useSessionTimeSeries(
    athleteId,
    sessionId
  );

  const isLoading = detailLoading;

  // useMemo must be called before any early returns to maintain hook order
  const tsPoints = useMemo(() => {
    if (!timeSeries?.points) return [];
    let elapsed = 0;
    return timeSeries.points.map((p: any, i: number) => {
      if (i > 0 && timeSeries.points[i - 1]) {
        const prev = new Date(timeSeries.points[i - 1].timestamp).getTime();
        const curr = new Date(p.timestamp).getTime();
        elapsed += (curr - prev) / 1000;
      }
      return {
        elapsed: Math.round(elapsed),
        elapsedMin: Math.round(elapsed / 60),
        hr: p.hr,
        power: p.power,
        cadence: p.cadence,
        speed: p.speed,
        altitude: p.altitude,
      };
    });
  }, [timeSeries]);

  if (isLoading) return <DetailSkeleton />;
  if (!detail) {
    return (
      <div data-testid="session-detail-empty" className="py-4 text-center text-sm text-muted-foreground">
        Kunne ikke indlaese sessionsdetaljer.
      </div>
    );
  }

  const { session, analytics, laps } = detail;

  const zoneSeconds = analytics
    ? [
        analytics.zone1Seconds,
        analytics.zone2Seconds,
        analytics.zone3Seconds,
        analytics.zone4Seconds,
        analytics.zone5Seconds,
      ]
    : [0, 0, 0, 0, 0];

  const totalZoneSeconds = zoneSeconds.reduce((a, b) => a + b, 0);

  const zoneDistribution = {
    zone1: zoneSeconds[0],
    zone2: zoneSeconds[1],
    zone3: zoneSeconds[2],
    zone4: zoneSeconds[3],
    zone5: zoneSeconds[4],
  };

  const zoneTableData = zoneSeconds.map((sec, i) => ({
    zone: ZONE_LABELS[i],
    seconds: sec,
    pct: totalZoneSeconds > 0 ? (sec / totalZoneSeconds) * 100 : 0,
    color: ZONE_COLORS[i],
  }));

  const zoneBarChartData = zoneTableData.map((z) => ({
    name: z.zone,
    pct: Math.round(z.pct),
    fill: z.color,
  }));

  const hasPower = session.sport === "bike" && session.avgPower != null;
  const hasPace = (session.sport === "run" || session.sport === "swim") && session.avgPace != null;

  // tsPoints is computed above (before early returns) to maintain hook order

  return (
    <div data-testid="session-detail">
      <Tabs.Root defaultValue="overview">
        <Tabs.List className="mb-4 flex gap-1 rounded-lg bg-muted/50 p-1">
          <Tabs.Trigger
            value="overview"
            data-testid="tab-overview"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Overblik
          </Tabs.Trigger>
          <Tabs.Trigger
            value="zones"
            data-testid="tab-zones"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Zoner
          </Tabs.Trigger>
          <Tabs.Trigger
            value="dynamics"
            data-testid="tab-dynamics"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Dynamik / Effektivitet
          </Tabs.Trigger>
        </Tabs.List>

        {/* ── Tab: Overblik ─────────────────────────────────────────── */}
        <Tabs.Content value="overview" data-testid="tab-content-overview">
          {/* Stat cards */}
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard
              label="Gns. puls"
              value={session.avgHr ? Math.round(session.avgHr) : "–"}
              unit="bpm"
            />
            {hasPower && (
              <StatCard
                label="Gns. power"
                value={Math.round(session.avgPower!)}
                unit="W"
              />
            )}
            {hasPace && (
              <StatCard
                label="Gns. pace"
                value={formatPace(session.avgPace!)}
              />
            )}
            {analytics?.intensityFactor != null && (
              <StatCard
                label="IF"
                value={analytics.intensityFactor.toFixed(2)}
              />
            )}
            <StatCard
              label="Varighed"
              value={formatDuration(session.durationSeconds)}
            />
            <StatCard
              label="TSS"
              value={session.tss != null ? Math.round(session.tss) : "–"}
            />
          </div>

          {/* HR area chart with zone bands */}
          {tsPoints.length > 0 && (
            <div data-testid="hr-area-chart" className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tsPoints} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="elapsedMin"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => `${v}m`}
                  />
                  <YAxis
                    domain={[60, 210]}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    width={35}
                  />
                  <Tooltip cursor={false}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(val: number) => [`${val} bpm`, "Puls"]}
                    labelFormatter={(v) => `${v} min`}
                  />
                  {/* Zone reference areas */}
                  <ReferenceArea y1={60} y2={120} fill="var(--zone-1)" fillOpacity={0.08} />
                  <ReferenceArea y1={120} y2={140} fill="var(--zone-2)" fillOpacity={0.08} />
                  <ReferenceArea y1={140} y2={160} fill="var(--zone-3)" fillOpacity={0.08} />
                  <ReferenceArea y1={160} y2={180} fill="var(--zone-4)" fillOpacity={0.08} />
                  <ReferenceArea y1={180} y2={210} fill="var(--zone-5)" fillOpacity={0.08} />
                  <Area
                    type="monotone"
                    dataKey="hr"
                    stroke="hsl(0, 80%, 55%)"
                    fill="hsl(0, 80%, 55%)"
                    fillOpacity={0.2}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                    name="Puls"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Tabs.Content>

        {/* ── Tab: Zoner ────────────────────────────────────────────── */}
        <Tabs.Content value="zones" data-testid="tab-content-zones">
          {totalZoneSeconds === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Ingen zonedata tilgaengelig for denne session.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Zone distribution bar */}
              <ZoneBar distribution={zoneDistribution} height={16} showLabels />

              {/* Horizontal bar chart */}
              <div data-testid="zone-bar-chart" className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={zoneBarChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, bottom: 5, left: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      width={50}
                    />
                    <Tooltip cursor={false}
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(val: number) => [`${val}%`, "Tid"]}
                    />
                    <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                      {zoneBarChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Zone table */}
              <div data-testid="zone-table" className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4">Zone</th>
                      <th className="pb-2 pr-4 text-right">Tid</th>
                      <th className="pb-2 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zoneTableData.map((z, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="flex items-center gap-2 py-2 pr-4">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: z.color }}
                          />
                          {z.zone}
                        </td>
                        <td className="py-2 pr-4 text-right font-medium">
                          {formatDuration(z.seconds)}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {Math.round(z.pct)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Tabs.Content>

        {/* ── Tab: Dynamik / Effektivitet ───────────────────────────── */}
        <Tabs.Content value="dynamics" data-testid="tab-content-dynamics">
          <div className="space-y-4">
            {/* Sport-specific metrics */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {analytics?.efficiencyFactor != null && (
                <StatCard
                  label="Efficiency Factor"
                  value={analytics.efficiencyFactor.toFixed(2)}
                />
              )}
              {analytics?.decoupling != null && (
                <div
                  data-testid="decoupling-card"
                  className={`rounded-lg border p-3 ${
                    analytics.decoupling < 5
                      ? "border-green-500/30 bg-green-500/10"
                      : analytics.decoupling < 10
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-red-500/30 bg-red-500/10"
                  }`}
                >
                  <p className="text-xs text-muted-foreground">Afkobling</p>
                  <p className={`text-lg font-bold ${
                    analytics.decoupling < 5
                      ? "text-green-400"
                      : analytics.decoupling < 10
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}>
                    {analytics.decoupling.toFixed(1)}%
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {analytics.decoupling < 5
                      ? "God aerob fitness"
                      : analytics.decoupling < 10
                        ? "Moderat drift"
                        : "Hoej drift — base ikke klar"}
                  </p>
                </div>
              )}
              {analytics?.variabilityIndex != null && (
                <StatCard
                  label="Variability Index"
                  value={`${analytics.variabilityIndex.toFixed(1)}%`}
                />
              )}
              {session.normalizedPower != null && (
                <StatCard
                  label="Norm. Power"
                  value={Math.round(session.normalizedPower)}
                  unit="W"
                />
              )}
              {session.avgCadence != null && (
                <StatCard
                  label="Gns. kadence"
                  value={Math.round(session.avgCadence)}
                  unit={session.sport === "bike" ? "rpm" : "spm"}
                />
              )}
              {session.elevationGain != null && (
                <StatCard
                  label="Stigning"
                  value={Math.round(session.elevationGain)}
                  unit="m"
                />
              )}
              {session.calories != null && (
                <StatCard
                  label="Kalorier"
                  value={Math.round(session.calories)}
                  unit="kcal"
                />
              )}
              {analytics?.trimp != null && (
                <StatCard
                  label="TRIMP"
                  value={Math.round(analytics.trimp)}
                />
              )}
            </div>

            {/* Time series multi-line chart */}
            {tsPoints.length > 0 && (
              <div data-testid="dynamics-chart" className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tsPoints} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="elapsedMin"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickFormatter={(v) => `${v}m`}
                    />
                    <YAxis
                      yAxisId="hr"
                      orientation="left"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      width={35}
                    />
                    {hasPower && (
                      <YAxis
                        yAxisId="power"
                        orientation="right"
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        width={40}
                      />
                    )}
                    <Tooltip cursor={false}
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelFormatter={(v) => `${v} min`}
                    />
                    <Legend
                      verticalAlign="top"
                      height={30}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    <Line
                      yAxisId="hr"
                      type="monotone"
                      dataKey="hr"
                      stroke="hsl(0, 80%, 55%)"
                      strokeWidth={1.5}
                      dot={false}
                      connectNulls
                      name="Puls"
                    />
                    {hasPower && (
                      <Line
                        yAxisId="power"
                        type="monotone"
                        dataKey="power"
                        stroke="hsl(45, 90%, 50%)"
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls
                        name="Power"
                      />
                    )}
                    <Line
                      yAxisId="hr"
                      type="monotone"
                      dataKey="cadence"
                      stroke="hsl(210, 70%, 55%)"
                      strokeWidth={1}
                      dot={false}
                      connectNulls
                      name="Kadence"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Laps table */}
            {laps.length > 0 && (
              <div data-testid="laps-table" className="overflow-x-auto">
                <h4 className="mb-2 text-sm font-semibold text-foreground">Omgange</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-3">#</th>
                      <th className="pb-2 pr-3">Tid</th>
                      <th className="pb-2 pr-3">Distance</th>
                      <th className="pb-2 pr-3">Gns. puls</th>
                      {hasPower && <th className="pb-2 pr-3">Gns. power</th>}
                      {hasPace && <th className="pb-2 pr-3">Gns. pace</th>}
                      {session.avgCadence != null && <th className="pb-2">Kadence</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {laps.map((lap) => (
                      <tr key={lap.id} className="border-b border-border/30">
                        <td className="py-1.5 pr-3 font-medium">{lap.lapNumber}</td>
                        <td className="py-1.5 pr-3">
                          {formatDuration(lap.durationSeconds)}
                        </td>
                        <td className="py-1.5 pr-3">
                          {lap.distanceMeters
                            ? formatDistance(lap.distanceMeters)
                            : "–"}
                        </td>
                        <td className="py-1.5 pr-3">
                          {lap.avgHr ? `${Math.round(lap.avgHr)} bpm` : "–"}
                        </td>
                        {hasPower && (
                          <td className="py-1.5 pr-3">
                            {lap.avgPower ? `${Math.round(lap.avgPower)} W` : "–"}
                          </td>
                        )}
                        {hasPace && (
                          <td className="py-1.5 pr-3">
                            {lap.avgPace ? formatPace(lap.avgPace) : "–"}
                          </td>
                        )}
                        {session.avgCadence != null && (
                          <td className="py-1.5">
                            {lap.avgCadence ? Math.round(lap.avgCadence) : "–"}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty state for dynamics */}
            {!analytics && tsPoints.length === 0 && laps.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Ingen dynamik- eller effektivitetsdata tilgaengelig.
              </p>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
