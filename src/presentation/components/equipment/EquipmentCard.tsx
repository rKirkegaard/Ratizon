import { getCategoryInfo } from "@/domain/constants/equipmentCategories";
import EquipmentLifespanBar from "./EquipmentLifespanBar";
import type { Equipment } from "@/domain/types/equipment.types";

interface EquipmentCardProps {
  item: Equipment;
  onClick: () => void;
}

export default function EquipmentCard({ item, onClick }: EquipmentCardProps) {
  const cat = getCategoryInfo(item.equipmentType);

  return (
    <button
      data-testid={`equipment-card-${item.id}`}
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-card p-4 text-left hover:bg-accent/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{cat.icon}</span>
          <div>
            <div className="text-sm font-medium text-foreground">{item.name}</div>
            {(item.brand || item.model) && (
              <div className="text-xs text-muted-foreground">{[item.brand, item.model].filter(Boolean).join(" · ")}</div>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {item.isDefaultFor && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">DEFAULT</span>
          )}
          {item.retired && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">ARKIVERET</span>
          )}
        </div>
      </div>

      <div className="mb-2 flex gap-3 text-xs text-muted-foreground">
        <span>{Math.round(item.currentDistanceKm + (item.initialKm ?? 0))} km</span>
        <span>{item.sessionCount} sessioner</span>
      </div>

      <EquipmentLifespanBar
        currentKm={item.currentDistanceKm + (item.initialKm ?? 0)}
        maxKm={item.maxDistanceKm}
        currentHours={item.currentDurationHours}
        maxHours={item.maxDurationHours}
      />
    </button>
  );
}
