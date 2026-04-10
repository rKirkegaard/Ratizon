import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, Plus } from "lucide-react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useEquipment } from "@/application/hooks/equipment/useEquipment";
import { SPORT_CATEGORIES } from "@/domain/constants/equipmentCategories";
import EquipmentCard from "@/presentation/components/equipment/EquipmentCard";
import EquipmentModal from "@/presentation/components/equipment/EquipmentModal";
import type { Equipment } from "@/domain/types/equipment.types";

type Tab = "alle" | "cykel" | "loeb" | "svoem" | "arkiveret";

const TABS: { key: Tab; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "cykel", label: "Cykel" },
  { key: "loeb", label: "Loeb" },
  { key: "svoem", label: "Svoem" },
  { key: "arkiveret", label: "Arkiveret" },
];

export default function EquipmentPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const navigate = useNavigate();
  const { data: equipmentData, isLoading } = useEquipment(athleteId);
  const [activeTab, setActiveTab] = useState<Tab>("alle");
  const [modalOpen, setModalOpen] = useState(false);

  const items: Equipment[] = useMemo(() => {
    const raw = equipmentData?.data ?? (Array.isArray(equipmentData) ? equipmentData : []) as Equipment[];
    return raw;
  }, [equipmentData]);

  const filtered = useMemo(() => {
    if (activeTab === "arkiveret") return items.filter((i) => i.retired);
    const active = items.filter((i) => !i.retired);
    if (activeTab === "alle") return active;
    const sportCats = activeTab === "cykel" ? SPORT_CATEGORIES.bike : activeTab === "loeb" ? SPORT_CATEGORIES.run : SPORT_CATEGORIES.swim;
    return active.filter((i) => sportCats?.includes(i.equipmentType));
  }, [items, activeTab]);

  // Sort: defaults first, then by session count desc
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.isDefaultFor && !b.isDefaultFor) return -1;
      if (!a.isDefaultFor && b.isDefaultFor) return 1;
      return (b.sessionCount ?? 0) - (a.sessionCount ?? 0);
    });
  }, [filtered]);

  if (!athleteId) {
    return (
      <div data-testid="equipment-page" className="p-4 md:p-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Udstyr</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">Vaelg en atlet for at se udstyr.</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="equipment-page" className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Udstyr</h1>
          <span className="text-sm text-muted-foreground">({items.filter((i) => !i.retired).length} aktive)</span>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Nyt udstyr
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.key ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Equipment grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            {activeTab === "arkiveret" ? "Intet arkiveret udstyr." : "Intet udstyr fundet. Opret nyt udstyr ovenfor."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((item) => (
            <EquipmentCard key={item.id} item={item} onClick={() => navigate(`/udstyr/${item.id}`)} />
          ))}
        </div>
      )}

      {/* Create modal */}
      <EquipmentModal open={modalOpen} onClose={() => setModalOpen(false)} athleteId={athleteId} />
    </div>
  );
}
