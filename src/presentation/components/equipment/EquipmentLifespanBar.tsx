import { getLifespanStatus } from "@/domain/constants/equipmentCategories";

interface EquipmentLifespanBarProps {
  currentKm: number;
  maxKm: number | null;
  currentHours?: number;
  maxHours?: number | null;
  size?: "sm" | "md";
}

export default function EquipmentLifespanBar({ currentKm, maxKm, currentHours, maxHours, size = "sm" }: EquipmentLifespanBarProps) {
  let pct: number | null = null;
  let label = "";

  if (maxKm && maxKm > 0) {
    pct = (currentKm / maxKm) * 100;
    label = `${Math.round(currentKm)}/${maxKm} km`;
  } else if (maxHours && maxHours > 0 && currentHours != null) {
    pct = (currentHours / maxHours) * 100;
    label = `${Math.round(currentHours)}/${maxHours} timer`;
  }

  if (pct === null) return null;

  const status = getLifespanStatus(pct);
  const barColor = status === "exceeded" ? "bg-red-500" : status === "critical" ? "bg-orange-500" : status === "warning" ? "bg-yellow-500" : "bg-green-500";
  const h = size === "md" ? "h-3" : "h-2";

  return (
    <div data-testid="lifespan-bar">
      <div className={`w-full overflow-hidden rounded-full bg-muted ${h}`}>
        <div className={`${h} rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className={status === "exceeded" ? "text-red-400" : status === "critical" ? "text-orange-400" : status === "warning" ? "text-yellow-400" : ""}>
          {status === "warning" && "🟡"}{status === "critical" && "🟠"}{status === "exceeded" && "🔴"} {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}
