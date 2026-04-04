import { useState } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import {
  useEquipment,
  useCreateEquipment,
  useDeleteEquipment,
} from "@/application/hooks/equipment/useEquipment";
import EquipmentList from "@/presentation/components/equipment/EquipmentList";
import EquipmentForm from "@/presentation/components/equipment/EquipmentForm";
import type { Equipment } from "@/domain/types/equipment.types";

const TYPE_LABELS: Record<string, string> = {
  shoes: "Sko",
  bike: "Cykel",
  wetsuit: "Vaadragt",
  watch: "Ur",
  other: "Andet",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function EquipmentPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: equipmentData, isLoading } = useEquipment(athleteId);
  const createMutation = useCreateEquipment(athleteId);
  const deleteMutation = useDeleteEquipment(athleteId);

  const items = equipmentData?.data ?? [];
  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  // No athlete selected
  if (!athleteId) {
    return (
      <div data-testid="equipment-page" className="mx-auto max-w-4xl p-4 md:p-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Udstyr</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            Vaelg en atlet for at se udstyr.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="equipment-page" className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-foreground">Udstyr</h1>

      {/* Equipment list */}
      <EquipmentList
        items={items}
        isLoading={isLoading}
        onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
        onDelete={(id) => {
          deleteMutation.mutate(id);
          if (selectedId === id) setSelectedId(null);
        }}
      />

      {/* Selected equipment detail */}
      {selectedItem && (
        <EquipmentDetail
          item={selectedItem}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Add equipment form */}
      <EquipmentForm
        onSubmit={(payload) => createMutation.mutate(payload)}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}

function EquipmentDetail({
  item,
  onClose,
}: {
  item: Equipment;
  onClose: () => void;
}) {
  const distancePct =
    item.maxDistanceKm && item.maxDistanceKm > 0
      ? Math.min(100, Math.round((item.currentDistanceKm / item.maxDistanceKm) * 100))
      : null;
  const durationPct =
    item.maxDurationHours && item.maxDurationHours > 0
      ? Math.min(
          100,
          Math.round((item.currentDurationHours / item.maxDurationHours) * 100)
        )
      : null;

  return (
    <div
      data-testid="equipment-detail"
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Luk
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Type</p>
          <p className="text-sm font-medium text-foreground">
            {TYPE_LABELS[item.equipmentType] ?? item.equipmentType}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Maerke / Model</p>
          <p className="text-sm font-medium text-foreground">
            {[item.brand, item.model].filter(Boolean).join(" ") || "–"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Koebt</p>
          <p className="text-sm font-medium text-foreground">
            {formatDate(item.purchaseDate)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <p
            className={`text-sm font-medium ${
              item.retired ? "text-muted-foreground" : "text-green-400"
            }`}
          >
            {item.retired ? "Pensioneret" : "Aktiv"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Total afstand</p>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {Math.round(item.currentDistanceKm)} km
          </p>
          {distancePct !== null && (
            <div className="mt-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>
                  af {item.maxDistanceKm} km
                </span>
                <span>{distancePct}%</span>
              </div>
              <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${
                    distancePct >= 90
                      ? "bg-red-500"
                      : distancePct >= 70
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${distancePct}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total varighed</p>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {item.currentDurationHours.toFixed(1)} timer
          </p>
          {durationPct !== null && (
            <div className="mt-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>
                  af {item.maxDurationHours} timer
                </span>
                <span>{durationPct}%</span>
              </div>
              <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${
                    durationPct >= 90
                      ? "bg-red-500"
                      : durationPct >= 70
                        ? "bg-yellow-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${durationPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Sessioner</p>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {item.sessionCount}
          </p>
        </div>
      </div>

      {item.notes && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">Noter</p>
          <p className="text-sm text-foreground">{item.notes}</p>
        </div>
      )}
    </div>
  );
}
