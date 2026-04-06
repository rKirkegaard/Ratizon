import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAthleteStore } from "@/application/stores/athleteStore";
import type { WeeklyReportDiscipline } from "@/application/hooks/analytics/useAnalytics";

interface DisciplineBalanceProps {
  disciplines: WeeklyReportDiscipline[];
  selectedSport: string | null;
  onSelectSport: (sport: string | null) => void;
}

function formatMinutes(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}t ${m}m`;
  return `${m}m`;
}

export default function DisciplineBalance({
  disciplines,
  selectedSport,
  onSelectSport,
}: DisciplineBalanceProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);

  const chartData = disciplines.map((d) => ({
    name: d.sport,
    value: d.durationSeconds,
    tss: d.tss,
    sessions: d.sessions,
  }));

  const totalDuration = disciplines.reduce(
    (sum, d) => sum + d.durationSeconds,
    0
  );

  if (disciplines.length === 0) {
    return (
      <div
        data-testid="discipline-balance"
        className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Ingen disciplindata for denne uge.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="discipline-balance" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Disciplinfordeling</h3>

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        {/* Donut chart */}
        <div className="h-48 w-48 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
                cursor="pointer"
                onClick={(_: unknown, index: number) => {
                  const sport = chartData[index].name;
                  onSelectSport(selectedSport === sport ? null : sport);
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={getSportColor(entry.name)}
                    stroke="none"
                    opacity={
                      selectedSport && selectedSport !== entry.name ? 0.3 : 1
                    }
                  />
                ))}
              </Pie>
              <Tooltip cursor={false}
                formatter={(value: number) => formatMinutes(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "hsl(var(--foreground))",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2">Disciplin</th>
                <th className="pb-2 text-right">Tid</th>
                <th className="pb-2 text-right">TSS</th>
                <th className="pb-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {disciplines.map((d) => {
                const pct =
                  totalDuration > 0
                    ? Math.round((d.durationSeconds / totalDuration) * 100)
                    : 0;
                const isSelected = selectedSport === d.sport;
                const isDimmed = selectedSport && !isSelected;
                return (
                  <tr
                    key={d.sport}
                    data-testid={`discipline-row-${d.sport}`}
                    className={`cursor-pointer border-t border-border/50 transition-opacity ${
                      isDimmed ? "opacity-40" : ""
                    }`}
                    onClick={() =>
                      onSelectSport(isSelected ? null : d.sport)
                    }
                  >
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: getSportColor(d.sport) }}
                        />
                        <span className="capitalize text-foreground">{d.sport}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right text-foreground">
                      {formatMinutes(d.durationSeconds)}
                    </td>
                    <td className="py-2 text-right text-foreground">
                      {Math.round(d.tss)}
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
