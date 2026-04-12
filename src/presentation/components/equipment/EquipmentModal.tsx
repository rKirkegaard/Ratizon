import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import DatePicker from "@/presentation/components/shared/DatePicker";
import { CATEGORY_ICONS, CATEGORY_LABELS, DEFAULT_RETIREMENT, SPORT_CATEGORIES } from "@/domain/constants/equipmentCategories";
import { useCreateEquipment, useUpdateEquipment } from "@/application/hooks/equipment/useEquipment";
import type { Equipment } from "@/domain/types/equipment.types";

interface EquipmentModalProps {
  open: boolean;
  onClose: () => void;
  athleteId: string;
  equipment?: Equipment;
}

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value, label, icon: CATEGORY_ICONS[value] ?? "🎽",
}));

export default function EquipmentModal({ open, onClose, athleteId, equipment }: EquipmentModalProps) {
  const isEdit = !!equipment;
  const createMutation = useCreateEquipment(athleteId);
  const updateMutation = useUpdateEquipment(athleteId);

  const [category, setCategory] = useState("run_shoes");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [initialKm, setInitialKm] = useState("0");
  const [retirementKm, setRetirementKm] = useState("");
  const [retirementHours, setRetirementHours] = useState("");
  const [isDefaultFor, setIsDefaultFor] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (equipment) {
      setCategory(equipment.equipmentType);
      setName(equipment.name);
      setBrand(equipment.brand ?? "");
      setModel(equipment.model ?? "");
      setPurchaseDate(equipment.purchaseDate ? equipment.purchaseDate.split("T")[0] : "");
      setInitialKm(String(equipment.initialKm ?? 0));
      setRetirementKm(equipment.maxDistanceKm ? String(equipment.maxDistanceKm) : "");
      setRetirementHours(equipment.maxDurationHours ? String(equipment.maxDurationHours) : "");
      setIsDefaultFor(equipment.isDefaultFor ?? "");
      setNotes(equipment.notes ?? "");
    } else {
      setCategory("run_shoes");
      setName(""); setBrand(""); setModel(""); setPurchaseDate("");
      setInitialKm("0"); setRetirementKm(""); setRetirementHours("");
      setIsDefaultFor(""); setNotes("");
      // Auto-fill defaults for category
      const def = DEFAULT_RETIREMENT.run_shoes;
      if (def?.km) setRetirementKm(String(def.km));
    }
  }, [open, equipment]);

  // Auto-fill retirement when category changes
  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    const def = DEFAULT_RETIREMENT[cat];
    if (def?.km) setRetirementKm(String(def.km));
    else setRetirementKm("");
    if (def?.hours) setRetirementHours(String(def.hours));
    else setRetirementHours("");
    // Suggest default-for sport
    const sport = Object.entries(SPORT_CATEGORIES).find(([, cats]) => cats.includes(cat))?.[0] ?? "";
    setIsDefaultFor(sport);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const payload = {
      equipmentType: category,
      name: name.trim(),
      brand: brand || null,
      model: model || null,
      purchaseDate: purchaseDate || null,
      initialKm: Number(initialKm) || 0,
      maxDistanceKm: retirementKm ? Number(retirementKm) : null,
      maxDurationHours: retirementHours ? Number(retirementHours) : null,
      isDefaultFor: isDefaultFor || null,
      notes: notes || null,
    };

    if (isEdit && equipment) {
      updateMutation.mutate({ id: equipment.id, ...payload } as any, { onSuccess: onClose });
    } else {
      createMutation.mutate(payload, { onSuccess: onClose });
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  if (!open) return null;

  return (
    <div data-testid="equipment-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-foreground">{isEdit ? "Rediger udstyr" : "Nyt udstyr"}</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Kategori *</label>
            <select value={category} onChange={(e) => handleCategoryChange(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Navn *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="f.eks. Saucony Endorphin Pro 3" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Maerke</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Model</label>
              <input value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Koebsdato</label>
              <DatePicker value={purchaseDate} onChange={setPurchaseDate} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Startkilometer</label>
              <input type="number" value={initialKm} onChange={(e) => setInitialKm(e.target.value)} min="0" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Levetid (km)</label>
              <input type="number" value={retirementKm} onChange={(e) => setRetirementKm(e.target.value)} placeholder="f.eks. 700" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Levetid (timer)</label>
              <input type="number" value={retirementHours} onChange={(e) => setRetirementHours(e.target.value)} placeholder="f.eks. 200" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Saet som default for</label>
            <select value={isDefaultFor} onChange={(e) => setIsDefaultFor(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              <option value="">Ingen</option>
              <option value="run">Loeb</option>
              <option value="bike">Cykel</option>
              <option value="swim">Svoemning</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Noter</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground resize-none" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuller</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? "Gem aendringer" : "Gem udstyr"}
          </button>
        </div>
      </div>
    </div>
  );
}
