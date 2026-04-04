import type { Equipment } from "@/domain/types/equipment.types";

interface EquipmentListProps {
  items: Equipment[];
  isLoading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatDistance(km: number): string {
  return km >= 1000 ? `${(km / 1000).toFixed(1)}k` : `${Math.round(km)}`;
}

function lifespanPercent(item: Equipment): number | null {
  if (item.maxDistanceKm && item.maxDistanceKm > 0) {
    return Math.min(100, Math.round((item.currentDistanceKm / item.maxDistanceKm) * 100));
  }
  if (item.maxDurationHours && item.maxDurationHours > 0) {
    return Math.min(
      100,
      Math.round((item.currentDurationHours / item.maxDurationHours) * 100)
    );
  }
  return null;
}

function getLifespanColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-yellow-500";
  return "bg-green-500";
}

const TYPE_LABELS: Record<string, string> = {
  shoes: "Sko",
  bike: "Cykel",
  wetsuit: "Vaadragt",
  watch: "Ur",
  other: "Andet",
};

export default function EquipmentList({
  items,
  isLoading,
  onSelect,
  onDelete,
}: EquipmentListProps) {
  if (isLoading) {
    return (
      <div data-testid="equipment-list" className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg border border-border/50 bg-muted"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        data-testid="equipment-list"
        className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border"
      >
        <p className="text-sm text-muted-foreground">
          Intet udstyr registreret. Tilfoej dit foerste udstyr nedenfor.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="equipment-list" className="space-y-2">
      {items.map((item) => {
        const pct = lifespanPercent(item);
        return (
          <div
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="cursor-pointer rounded-lg border border-border/50 bg-card px-4 py-3 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      item.retired
                        ? "bg-muted text-muted-foreground"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {item.retired ? "Pensioneret" : "Aktiv"}
                  </span>
                </div>
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <span>{TYPE_LABELS[item.equipmentType] ?? item.equipmentType}</span>
                  {item.brand && <span>{item.brand}</span>}
                  <span>{formatDistance(item.currentDistanceKm)} km</span>
                  <span>{item.sessionCount} sessioner</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Lifespan bar */}
                {pct !== null && (
                  <div className="w-24">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Levetid</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${getLifespanColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                  title="Slet udstyr"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
