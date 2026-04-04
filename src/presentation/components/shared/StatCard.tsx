import { TrendIndicator } from "./TrendIndicator";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  accentColor?: string;
}

export function StatCard({ label, value, unit, trend, accentColor }: StatCardProps) {
  return (
    <div
      data-testid="stat-card"
      className="rounded-lg border border-border bg-card p-4"
      style={accentColor ? { borderLeftColor: accentColor, borderLeftWidth: 3 } : undefined}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {trend !== undefined && (
        <div className="mt-2">
          <TrendIndicator value={trend} />
        </div>
      )}
    </div>
  );
}

export default StatCard;
