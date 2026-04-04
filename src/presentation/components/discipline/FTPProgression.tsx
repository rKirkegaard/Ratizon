import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAthleteStore } from "@/application/stores/athleteStore";
import type { PowerCurvePoint } from "@/application/hooks/analytics/useCyclingAnalytics";

interface FTPProgressionProps {
  /** Power curve data — we derive FTP from the 20min power * 0.95 */
  powerCurveData: PowerCurvePoint[];
  currentFtp?: number | null;
}

export default function FTPProgression({ powerCurveData, currentFtp }: FTPProgressionProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const bikeColor = getSportColor("bike");

  // Find the 20-min (1200s) power entry to derive estimated FTP
  const twentyMinEntry = powerCurveData.find((p) => p.durationSec === 1200);
  const estimatedFtp = twentyMinEntry?.current90d
    ? Math.round(twentyMinEntry.current90d * 0.95)
    : null;

  const ftpValue = currentFtp ?? estimatedFtp;

  if (!ftpValue) {
    return (
      <div
        data-testid="ftp-progression"
        className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ikke nok data til at vise FTP-progression. Upload sessioner med 20 min effekt.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="ftp-progression" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        FTP Estimat
      </h3>
      <div className="flex items-center gap-6">
        <div>
          <p className="text-3xl font-bold" style={{ color: bikeColor }}>
            {ftpValue} W
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {estimatedFtp
              ? "Baseret paa 20 min effekt x 0.95"
              : "Konfigureret FTP"}
          </p>
        </div>
        {estimatedFtp && currentFtp && estimatedFtp !== currentFtp && (
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Konfigureret</p>
            <p className="text-lg font-semibold text-foreground">{currentFtp} W</p>
            <p className="text-xs text-muted-foreground">Estimeret</p>
            <p className="text-lg font-semibold text-foreground">{estimatedFtp} W</p>
          </div>
        )}
      </div>
      {twentyMinEntry && (
        <div className="mt-3 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                { label: "5m", power: powerCurveData.find((p) => p.durationSec === 300)?.current90d ?? null },
                { label: "20m", power: twentyMinEntry.current90d },
                { label: "1t", power: powerCurveData.find((p) => p.durationSec === 3600)?.current90d ?? null },
              ].filter((d) => d.power !== null)}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${Math.round(value)} W`, "Effekt"]}
              />
              <Line
                type="monotone"
                dataKey="power"
                stroke={bikeColor}
                strokeWidth={2}
                dot={{ fill: bikeColor, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
