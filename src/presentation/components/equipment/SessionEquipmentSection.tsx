import { useState, useEffect, useMemo } from "react";
import { Wrench, Plus, X, SplitSquareHorizontal } from "lucide-react";
import { apiClient } from "@/application/api/client";
import { CATEGORY_ICONS, SPORT_CATEGORIES } from "@/domain/constants/equipmentCategories";
import EquipmentSplitModal from "./EquipmentSplitModal";

interface EquipmentLink {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  segmentType: string | null;
  lapIndices: string | null;
  distanceKm: number | null;
  segmentMin: number | null;
  maxDistanceKm: number | null;
  currentDistanceKm: number | null;
}

interface EquipmentItem {
  id: string;
  name: string;
  equipmentType: string;
  retired: boolean;
}

interface LapData {
  lapIndex: number;
  distanceM: number | null;
  durationSec: number;
  lapType: string | null;
  avgPowerW: number | null;
  avgHr: number | null;
}

interface SessionEquipmentSectionProps {
  sessionId: string | number;
  athleteId: string;
  sport?: string;
  totalDistanceM?: number;
  totalDurationMin?: number;
  laps?: LapData[];
}

function formatLapIndices(lapIndices: string): string {
  const indices = lapIndices.split(",").map(Number).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = indices[0], end = indices[0];
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] === end + 1) { end = indices[i]; } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = indices[i]; end = indices[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return `Lap ${ranges.join(", ")}`;
}

function getLifespanPct(current: number | null, max: number | null): number | null {
  if (!current || !max || max <= 0) return null;
  return (current / max) * 100;
}

export default function SessionEquipmentSection({ sessionId, athleteId, sport, totalDistanceM, totalDurationMin, laps }: SessionEquipmentSectionProps) {
  const [links, setLinks] = useState<EquipmentLink[]>([]);
  const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [splitOpen, setSplitOpen] = useState(false);

  const canSplit = sport && totalDistanceM && totalDurationMin && laps && laps.length > 0;

  const fetchLinks = () => {
    apiClient.get<any>(`/equipment/session/${sessionId}`).then((data) => {
      setLinks(Array.isArray(data) ? data : data?.data ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchLinks(); }, [sessionId]);

  useEffect(() => {
    if (!athleteId) return;
    apiClient.get<any>(`/equipment/${athleteId}`).then((data) => {
      setAllEquipment(Array.isArray(data) ? data : data?.data ?? []);
    }).catch(() => {});
  }, [athleteId]);

  const availableEquipment = useMemo(() => {
    const cats = sport ? SPORT_CATEGORIES[sport] ?? [] : [];
    const linkedIds = new Set(links.map((l) => l.equipmentId));
    return allEquipment.filter((e) => {
      if (e.retired) return false;
      if (linkedIds.has(e.id)) return false;
      if (cats.length > 0 && !cats.includes(e.equipmentType)) return false;
      return true;
    });
  }, [allEquipment, links, sport]);

  const handleAdd = async () => {
    if (!selectedId) return;
    await apiClient.post(`/equipment/session/${sessionId}`, {
      equipmentId: selectedId,
      segmentType: "full",
    }).catch(() => {});
    setAdding(false);
    setSelectedId("");
    fetchLinks();
  };

  const handleRemove = async (linkId: string) => {
    await apiClient.delete(`/equipment/session-link/${linkId}`).catch(() => {});
    fetchLinks();
  };

  return (
    <div data-testid="session-equipment-section" className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Udstyr</h3>
        </div>
        <div className="flex gap-1">
          {canSplit && (
            <button onClick={() => setSplitOpen(true)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent">
              <SplitSquareHorizontal className="h-3 w-3" /> Opdel
            </button>
          )}
          <button onClick={() => setAdding(!adding)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent">
            <Plus className="h-3 w-3" /> Tilfoej
          </button>
        </div>
      </div>

      {/* Linked equipment */}
      {loading ? (
        <div className="h-8 animate-pulse rounded bg-muted" />
      ) : links.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground">Intet udstyr tilknyttet</p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => {
            const icon = CATEGORY_ICONS[link.equipmentType] ?? "🎽";
            const pct = getLifespanPct(link.currentDistanceKm, link.maxDistanceKm);
            return (
              <div key={link.id} className="flex items-center justify-between rounded border border-border/40 px-3 py-2 text-sm">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span>{icon}</span>
                    <span className="text-foreground">{link.equipmentName}</span>
                    {pct !== null && pct >= 75 && (
                      <span className={`text-[10px] rounded px-1 ${pct >= 100 ? "bg-red-500/20 text-red-400" : pct >= 90 ? "bg-orange-500/20 text-orange-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                        {Math.round(pct)}%
                      </span>
                    )}
                  </div>
                  {link.lapIndices && (
                    <span className="text-xs text-muted-foreground">
                      {formatLapIndices(link.lapIndices)}
                      {link.distanceKm != null && ` · ${link.distanceKm.toFixed(1)} km`}
                    </span>
                  )}
                </div>
                <button onClick={() => handleRemove(link.id)} className="rounded p-1 text-muted-foreground hover:text-red-400">
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick add */}
      {adding && (
        <div className="mt-2 flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">Vaelg udstyr...</option>
            {availableEquipment.map((e) => (
              <option key={e.id} value={e.id}>{CATEGORY_ICONS[e.equipmentType] ?? "🎽"} {e.name}</option>
            ))}
          </select>
          <button onClick={handleAdd} disabled={!selectedId} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
            Tilfoej
          </button>
          <button onClick={() => setAdding(false)} className="rounded p-1 text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Split modal */}
      {canSplit && (
        <EquipmentSplitModal
          open={splitOpen}
          onClose={() => { setSplitOpen(false); fetchLinks(); }}
          sessionId={sessionId}
          athleteId={athleteId}
          sport={sport!}
          totalDistanceM={totalDistanceM!}
          totalDurationMin={totalDurationMin!}
          laps={laps!}
          existingLinks={links as any}
          allEquipment={allEquipment}
        />
      )}
    </div>
  );
}
