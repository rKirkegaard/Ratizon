import { useState } from "react";
import type { EquipmentCreatePayload } from "@/application/hooks/equipment/useEquipment";

interface EquipmentFormProps {
  onSubmit: (payload: EquipmentCreatePayload) => void;
  isSubmitting: boolean;
}

const EQUIPMENT_TYPES = [
  { value: "shoes", label: "Sko" },
  { value: "bike", label: "Cykel" },
  { value: "wetsuit", label: "Vaadragt" },
  { value: "watch", label: "Ur" },
  { value: "other", label: "Andet" },
];

export default function EquipmentForm({ onSubmit, isSubmitting }: EquipmentFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    equipmentType: "shoes",
    brand: "",
    model: "",
    maxDistanceKm: "",
    maxDurationHours: "",
    notes: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: form.name,
      equipmentType: form.equipmentType,
      brand: form.brand || undefined,
      model: form.model || undefined,
      maxDistanceKm: form.maxDistanceKm ? Number(form.maxDistanceKm) : null,
      maxDurationHours: form.maxDurationHours ? Number(form.maxDurationHours) : null,
      notes: form.notes || undefined,
    });
    setForm({
      name: "",
      equipmentType: "shoes",
      brand: "",
      model: "",
      maxDistanceKm: "",
      maxDurationHours: "",
      notes: "",
    });
    setShowForm(false);
  }

  if (!showForm) {
    return (
      <div data-testid="equipment-form">
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full rounded-lg border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          + Tilfoej udstyr
        </button>
      </div>
    );
  }

  return (
    <form
      data-testid="equipment-form"
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Nyt udstyr</h3>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Annuller
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Navn *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="F.eks. Nike Vaporfly 3"
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Type *
          </label>
          <select
            value={form.equipmentType}
            onChange={(e) => setForm({ ...form, equipmentType: e.target.value })}
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Maerke
          </label>
          <input
            type="text"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            placeholder="F.eks. Nike"
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Model
          </label>
          <input
            type="text"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            placeholder="F.eks. Vaporfly 3"
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Maks afstand (km)
          </label>
          <input
            type="number"
            value={form.maxDistanceKm}
            onChange={(e) => setForm({ ...form, maxDistanceKm: e.target.value })}
            placeholder="F.eks. 800"
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Maks varighed (timer)
          </label>
          <input
            type="number"
            value={form.maxDurationHours}
            onChange={(e) =>
              setForm({ ...form, maxDurationHours: e.target.value })
            }
            placeholder="F.eks. 500"
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Noter
          </label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Valgfrie noter"
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="mt-4">
        <button
          type="submit"
          disabled={isSubmitting || !form.name}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Opretter..." : "Opret udstyr"}
        </button>
      </div>
    </form>
  );
}
