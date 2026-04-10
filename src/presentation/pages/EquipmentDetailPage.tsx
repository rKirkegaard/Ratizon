import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useEquipmentStats, useEquipmentMonthlyUsage, useArchiveEquipment, useRestoreEquipment } from "@/application/hooks/equipment/useEquipment";
import { getCategoryInfo } from "@/domain/constants/equipmentCategories";
import EquipmentLifespanBar from "@/presentation/components/equipment/EquipmentLifespanBar";
import MonthlyUsageChart from "@/presentation/components/equipment/MonthlyUsageChart";
import EquipmentSessionList from "@/presentation/components/equipment/EquipmentSessionList";
import EquipmentNotificationSettings from "@/presentation/components/equipment/EquipmentNotificationSettings";
import EquipmentModal from "@/presentation/components/equipment/EquipmentModal";
import ArchiveConfirmModal from "@/presentation/components/equipment/ArchiveConfirmModal";

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);

  const { data: statsData, isLoading } = useEquipmentStats(athleteId, id ?? null);
  const { data: monthlyData, isLoading: monthlyLoading } = useEquipmentMonthlyUsage(athleteId, id ?? null);
  const archiveMutation = useArchiveEquipment(athleteId);
  const restoreMutation = useRestoreEquipment(athleteId);

  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  // Handle auto-unwrap
  const stats = (statsData as any)?.data ?? statsData;
  const monthly = (monthlyData as any)?.data ?? (Array.isArray(monthlyData) ? monthlyData : []);

  if (!athleteId || !id) {
    return <div className="p-4"><p className="text-sm text-muted-foreground">Vaelg en atlet og et udstyr.</p></div>;
  }

  if (isLoading) {
    return <div className="p-4 md:p-6 space-y-4">{[1,2,3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>;
  }

  if (!stats) {
    return <div className="p-4"><p className="text-sm text-muted-foreground">Udstyr ikke fundet.</p></div>;
  }

  const cat = getCategoryInfo(stats.equipmentType);
  const totalKm = stats.totalKm ?? (stats.currentDistanceKm + (stats.initialKm ?? 0));
  const totalHours = stats.totalHours ?? stats.currentDurationHours;

  const handleArchive = () => {
    if (stats.retired) {
      restoreMutation.mutate(id!, { onSuccess: () => { setArchiveOpen(false); navigate("/udstyr"); } });
    } else {
      archiveMutation.mutate(id!, { onSuccess: () => { setArchiveOpen(false); navigate("/udstyr"); } });
    }
  };

  return (
    <div data-testid="equipment-detail-page" className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/udstyr")} className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted"><ArrowLeft size={20} /></button>
          <span className="text-2xl">{cat.icon}</span>
          <div>
            <h1 className="text-xl font-bold text-foreground">{stats.name}</h1>
            {(stats.brand || stats.model) && <p className="text-sm text-muted-foreground">{[stats.brand, stats.model].filter(Boolean).join(" · ")}</p>}
          </div>
          {stats.retired && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">ARKIVERET</span>}
          {stats.isDefaultFor && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">DEFAULT</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"><Pencil size={14} /> Rediger</button>
          <button onClick={() => setArchiveOpen(true)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${stats.retired ? "bg-primary text-primary-foreground" : "bg-amber-600 text-white hover:bg-amber-700"}`}>
            {stats.retired ? "Gendan" : "Arkiver"}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-foreground">{Math.round(totalKm)} km</div>
          <div className="text-xs text-muted-foreground">Total distance</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-foreground">{Math.round(totalHours)} timer</div>
          <div className="text-xs text-muted-foreground">Total tid</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-foreground">{stats.sessionCount ?? 0}</div>
          <div className="text-xs text-muted-foreground">Sessioner</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-foreground">{stats.lastUsedAt ? new Date(stats.lastUsedAt).toLocaleDateString("da-DK") : "–"}</div>
          <div className="text-xs text-muted-foreground">Sidst brugt</div>
        </div>
      </div>

      {/* Lifespan bar */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Levetid</h3>
        <EquipmentLifespanBar currentKm={totalKm} maxKm={stats.maxDistanceKm} currentHours={totalHours} maxHours={stats.maxDurationHours} size="md" />
        {stats.remainingEstimate && (
          <p className="mt-2 text-xs text-muted-foreground">
            {stats.remainingEstimate === "Overskredet"
              ? "🔴 Levetidsgraense overskredet"
              : `Estimeret resterende: ${stats.remainingEstimate} (baseret paa ${stats.avgKmPerWeek ?? 0} km/uge)`}
          </p>
        )}
      </div>

      {/* Info card */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Detaljer</h3>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <div><span className="text-xs text-muted-foreground">Kategori:</span><div className="text-foreground">{cat.label}</div></div>
          {stats.purchaseDate && <div><span className="text-xs text-muted-foreground">Koebt:</span><div className="text-foreground">{new Date(stats.purchaseDate).toLocaleDateString("da-DK")}</div></div>}
          {stats.isDefaultFor && <div><span className="text-xs text-muted-foreground">Default for:</span><div className="text-foreground capitalize">{stats.isDefaultFor}</div></div>}
          {stats.initialKm > 0 && <div><span className="text-xs text-muted-foreground">Startkilometer:</span><div className="text-foreground">{stats.initialKm} km</div></div>}
          {stats.notes && <div className="col-span-full"><span className="text-xs text-muted-foreground">Noter:</span><div className="text-foreground">{stats.notes}</div></div>}
        </div>
      </div>

      {/* Monthly usage chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Maanedlig brug</h3>
        <MonthlyUsageChart data={monthly} isLoading={monthlyLoading} />
      </div>

      {/* Sessions list */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Sessioner med dette udstyr</h3>
        <EquipmentSessionList athleteId={athleteId} equipmentId={id} />
      </div>

      {/* Notification settings */}
      <EquipmentNotificationSettings athleteId={athleteId} equipmentId={id} maxDistanceKm={stats.maxDistanceKm} maxDurationHours={stats.maxDurationHours} />

      {/* Modals */}
      <EquipmentModal open={editOpen} onClose={() => setEditOpen(false)} athleteId={athleteId} equipment={stats} />
      <ArchiveConfirmModal open={archiveOpen} onClose={() => setArchiveOpen(false)} onConfirm={handleArchive} equipmentName={stats.name} isRestore={stats.retired} loading={archiveMutation.isPending || restoreMutation.isPending} />
    </div>
  );
}
