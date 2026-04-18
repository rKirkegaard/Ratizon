import { useState } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useSessions } from "@/application/hooks/training/useSessions";
import { useSessionComparison, usePeriodComparison } from "@/application/hooks/analytics/useComparison";
import DatePicker from "@/presentation/components/shared/DatePicker";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}t ${m}m` : `${m}m`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

function DeltaIndicator({ value, inverse }: { value: number | null; inverse?: boolean }) {
  if (value == null || value === 0) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  const improved = inverse ? value < 0 : value > 0;
  return improved
    ? <TrendingUp className="h-3.5 w-3.5 text-green-400" />
    : <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
}

type CompareMode = "sessions" | "periods";

export default function ComparisonPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const [mode, setMode] = useState<CompareMode>("sessions");

  // Session comparison state
  const { data: sessionsData } = useSessions(athleteId, "90d");
  const sessions = sessionsData?.sessions ?? [];
  const [sessionA, setSessionA] = useState<string | null>(null);
  const [sessionB, setSessionB] = useState<string | null>(null);
  const { data: sessionResult } = useSessionComparison(athleteId, sessionA, sessionB);

  // Period comparison state
  const [periodStartA, setPeriodStartA] = useState("");
  const [periodEndA, setPeriodEndA] = useState("");
  const [periodStartB, setPeriodStartB] = useState("");
  const [periodEndB, setPeriodEndB] = useState("");
  const { data: periodResult } = usePeriodComparison(
    athleteId,
    periodStartA || null, periodEndA || null,
    periodStartB || null, periodEndB || null
  );

  if (!athleteId) {
    return (
      <div data-testid="comparison-page" className="p-4 md:p-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Sammenligning</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">Vaelg en atlet.</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="comparison-page" className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Sammenligning</h1>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
          <button
            data-testid="mode-sessions"
            onClick={() => setMode("sessions")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "sessions" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Sessioner
          </button>
          <button
            data-testid="mode-periods"
            onClick={() => setMode("periods")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "periods" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Perioder
          </button>
        </div>
      </div>

      {/* Session comparison */}
      {mode === "sessions" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Session A</label>
              <select
                data-testid="select-session-a"
                value={sessionA ?? ""}
                onChange={(e) => setSessionA(e.target.value || null)}
                className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              >
                <option value="">Vaelg session...</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDate(s.startedAt)} — {s.sport} — {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Session B</label>
              <select
                data-testid="select-session-b"
                value={sessionB ?? ""}
                onChange={(e) => setSessionB(e.target.value || null)}
                className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              >
                <option value="">Vaelg session...</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDate(s.startedAt)} — {s.sport} — {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {sessionResult && (
            <div className="space-y-4">
              {/* Metrics table */}
              <div data-testid="session-comparison-table" className="rounded-lg border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Metrik</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Session A</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Session B</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Varighed", a: formatDuration(sessionResult.sessionA.durationSeconds), b: formatDuration(sessionResult.sessionB.durationSeconds), delta: sessionResult.deltas.durationSeconds, unit: "s" },
                      { label: "Distance", a: sessionResult.sessionA.distanceMeters ? `${(sessionResult.sessionA.distanceMeters / 1000).toFixed(1)} km` : "–", b: sessionResult.sessionB.distanceMeters ? `${(sessionResult.sessionB.distanceMeters / 1000).toFixed(1)} km` : "–", delta: sessionResult.deltas.distanceMeters, unit: "m" },
                      { label: "TSS", a: sessionResult.sessionA.tss?.toFixed(0) ?? "–", b: sessionResult.sessionB.tss?.toFixed(0) ?? "–", delta: sessionResult.deltas.tss },
                      { label: "Gns. HR", a: sessionResult.sessionA.avgHr ?? "–", b: sessionResult.sessionB.avgHr ?? "–", delta: sessionResult.deltas.avgHr, inverse: true },
                      { label: "Gns. Power", a: sessionResult.sessionA.avgPower ? `${sessionResult.sessionA.avgPower}W` : "–", b: sessionResult.sessionB.avgPower ? `${sessionResult.sessionB.avgPower}W` : "–", delta: sessionResult.deltas.avgPower },
                      { label: "Gns. Pace", a: sessionResult.sessionA.avgPace ? `${Math.floor(sessionResult.sessionA.avgPace / 60)}:${String(Math.round(sessionResult.sessionA.avgPace % 60)).padStart(2, "0")}/km` : "–", b: sessionResult.sessionB.avgPace ? `${Math.floor(sessionResult.sessionB.avgPace / 60)}:${String(Math.round(sessionResult.sessionB.avgPace % 60)).padStart(2, "0")}/km` : "–", delta: sessionResult.deltas.avgPace, inverse: true },
                      { label: "Kadence", a: sessionResult.sessionA.avgCadence ?? "–", b: sessionResult.sessionB.avgCadence ?? "–", delta: sessionResult.deltas.avgCadence },
                    ].map((row) => (
                      <tr key={row.label} className="border-b border-border/50">
                        <td className="px-4 py-2 text-foreground">{row.label}</td>
                        <td className="px-4 py-2 text-right text-foreground">{row.a}</td>
                        <td className="px-4 py-2 text-right text-foreground">{row.b}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <DeltaIndicator value={row.delta ?? null} inverse={row.inverse} />
                            <span className={`text-xs ${row.delta && row.delta > 0 ? "text-green-400" : row.delta && row.delta < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                              {row.delta != null ? (row.delta > 0 ? "+" : "") + row.delta : "–"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Zone comparison bar chart */}
              {sessionResult.sessionA.analytics && sessionResult.sessionB.analytics && (
                <div data-testid="zone-comparison" className="rounded-lg border border-border bg-card p-4">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Zonefordeling</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[1, 2, 3, 4, 5].map((z) => {
                          const totalA = sessionResult.sessionA.analytics!.zones.reduce((s, v) => s + v, 0);
                          const totalB = sessionResult.sessionB.analytics!.zones.reduce((s, v) => s + v, 0);
                          return {
                            zone: `Z${z}`,
                            "Session A": totalA > 0 ? Math.round(sessionResult.sessionA.analytics!.zones[z - 1] / totalA * 100) : 0,
                            "Session B": totalB > 0 ? Math.round(sessionResult.sessionB.analytics!.zones[z - 1] / totalB * 100) : 0,
                          };
                        })}
                        margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="zone" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={30} />
                        <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }} />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Bar dataKey="Session A" fill="#3B82F6" />
                        <Bar dataKey="Session B" fill="#F97316" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Period comparison */}
      {mode === "periods" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
              <h4 className="mb-2 text-xs font-semibold text-blue-400">Periode A</h4>
              <div className="grid grid-cols-2 gap-2">
                <DatePicker value={periodStartA} onChange={setPeriodStartA} placeholder="Start" />
                <DatePicker value={periodEndA} onChange={setPeriodEndA} placeholder="Slut" />
              </div>
            </div>
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
              <h4 className="mb-2 text-xs font-semibold text-orange-400">Periode B</h4>
              <div className="grid grid-cols-2 gap-2">
                <DatePicker value={periodStartB} onChange={setPeriodStartB} placeholder="Start" />
                <DatePicker value={periodEndB} onChange={setPeriodEndB} placeholder="Slut" />
              </div>
            </div>
          </div>

          {periodResult && (
            <div data-testid="period-comparison-result" className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Metrik</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-blue-400">Periode A</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-orange-400">Periode B</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-2">Sessioner</td>
                    <td className="px-4 py-2 text-right">{periodResult.periodA.sessionCount}</td>
                    <td className="px-4 py-2 text-right">{periodResult.periodB.sessionCount}</td>
                    <td className="px-4 py-2 text-right text-xs">{periodResult.deltas.sessionCount > 0 ? "+" : ""}{periodResult.deltas.sessionCount}</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-2">Total tid</td>
                    <td className="px-4 py-2 text-right">{formatDuration(periodResult.periodA.totalDurationSeconds)}</td>
                    <td className="px-4 py-2 text-right">{formatDuration(periodResult.periodB.totalDurationSeconds)}</td>
                    <td className="px-4 py-2 text-right text-xs">{formatDuration(Math.abs(periodResult.deltas.totalDurationSeconds))}</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-2">Total TSS</td>
                    <td className="px-4 py-2 text-right">{periodResult.periodA.totalTss}</td>
                    <td className="px-4 py-2 text-right">{periodResult.periodB.totalTss}</td>
                    <td className="px-4 py-2 text-right text-xs">{periodResult.deltas.totalTss > 0 ? "+" : ""}{periodResult.deltas.totalTss}</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="px-4 py-2">Gns. HR</td>
                    <td className="px-4 py-2 text-right">{periodResult.periodA.avgHr || "–"}</td>
                    <td className="px-4 py-2 text-right">{periodResult.periodB.avgHr || "–"}</td>
                    <td className="px-4 py-2 text-right text-xs">{periodResult.deltas.avgHr}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Gns. Power</td>
                    <td className="px-4 py-2 text-right">{periodResult.periodA.avgPower ? `${periodResult.periodA.avgPower}W` : "–"}</td>
                    <td className="px-4 py-2 text-right">{periodResult.periodB.avgPower ? `${periodResult.periodB.avgPower}W` : "–"}</td>
                    <td className="px-4 py-2 text-right text-xs">{periodResult.deltas.avgPower}W</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
