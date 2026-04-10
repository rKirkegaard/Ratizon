import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Check, X, Plus, Loader2 } from "lucide-react";
import { apiClient } from "@/application/api/client";

// ── Types ─────────────────────────────────────────────────────────────

interface LapData {
  lapIndex: number;
  distanceM: number | null;
  durationSec: number;
  lapType: string | null;
  avgPowerW: number | null;
  avgHr: number | null;
}

interface EquipmentItem {
  id: string;
  name: string;
  equipmentType: string;
  retired: boolean;
}

interface ExistingLink {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  segmentType: string | null;
  lapIndices: string | null;
  distanceKm: number | null;
}

interface EquipmentSplitModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string | number;
  athleteId: string;
  sport: string;
  totalDistanceM: number;
  totalDurationMin: number;
  laps: LapData[];
  existingLinks?: ExistingLink[];
  allEquipment: EquipmentItem[];
}

// ── Constants ─────────────────────────────────────────────────────────

import { CATEGORY_ICONS, SPORT_CATEGORIES } from "@/domain/constants/equipmentCategories";

function formatLapLabel(lap: LapData): string {
  const dist = lap.distanceM ? `${(lap.distanceM / 1000).toFixed(1)} km` : "";
  const dur = `${Math.floor(lap.durationSec / 60)}:${String(lap.durationSec % 60).padStart(2, "0")}`;
  return `Lap ${lap.lapIndex}${dist ? `: ${dist}` : ""} · ${dur}`;
}

// ── Component ─────────────────────────────────────────────────────────

export default function EquipmentSplitModal({
  open, onClose, sessionId, athleteId, sport,
  totalDistanceM, totalDurationMin, laps,
  existingLinks, allEquipment,
}: EquipmentSplitModalProps) {
  const [mode, setMode] = useState<"full" | "split">("full");
  const [fullEquipmentId, setFullEquipmentId] = useState("");
  const [assignments, setAssignments] = useState<Map<string, Set<number>>>(new Map());
  const [addingEquipment, setAddingEquipment] = useState(false);
  const [newEquipmentId, setNewEquipmentId] = useState("");
  const [saving, setSaving] = useState(false);

  const totalKm = totalDistanceM / 1000;

  // Filter equipment by sport
  const sportEquipment = useMemo(() => {
    const cats = SPORT_CATEGORIES[sport] ?? [];
    return allEquipment.filter((e) => !e.retired && (cats.length === 0 || cats.includes(e.equipmentType)));
  }, [allEquipment, sport]);

  // Initialize from existing links
  useEffect(() => {
    if (!open) return;
    if (existingLinks && existingLinks.length > 0) {
      const hasLaps = existingLinks.some((l) => l.lapIndices);
      if (hasLaps) {
        setMode("split");
        const map = new Map<string, Set<number>>();
        for (const link of existingLinks) {
          if (link.lapIndices) {
            map.set(link.equipmentId, new Set(link.lapIndices.split(",").map(Number)));
          }
        }
        setAssignments(map);
      } else {
        setMode("full");
        setFullEquipmentId(existingLinks[0]?.equipmentId ?? "");
      }
    } else {
      setMode("full");
      setFullEquipmentId("");
      setAssignments(new Map());
    }
  }, [open, existingLinks]);

  // Equipment summaries for split mode
  const equipmentSummaries = useMemo(() => {
    return [...assignments.entries()].map(([eqId, lapSet]) => {
      const eq = allEquipment.find((e) => e.id === eqId);
      let km = 0, min = 0;
      for (const idx of lapSet) {
        const lap = laps.find((l) => l.lapIndex === idx);
        if (lap?.distanceM) km += lap.distanceM / 1000;
        min += (lap?.durationSec ?? 0) / 60;
      }
      return { eqId, eq, lapSet, km, min };
    });
  }, [assignments, laps, allEquipment]);

  // Validation
  const allLapIndices = new Set(laps.map((l) => l.lapIndex));
  const assignedLaps = new Set<number>();
  for (const [, lapSet] of assignments) {
    for (const idx of lapSet) assignedLaps.add(idx);
  }
  const unassignedLaps = [...allLapIndices].filter((i) => !assignedLaps.has(i));

  const assignedKm = useMemo(() => {
    let total = 0;
    for (const [, lapSet] of assignments) {
      for (const idx of lapSet) {
        const lap = laps.find((l) => l.lapIndex === idx);
        if (lap?.distanceM) total += lap.distanceM;
      }
    }
    return total / 1000;
  }, [assignments, laps]);

  const kmMismatch = Math.abs(assignedKm - totalKm) > 0.1 && assignedKm > 0;

  // Toggle lap assignment (each lap can only belong to one equipment)
  const toggleLap = (eqId: string, lapIndex: number) => {
    setAssignments((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(eqId) ?? []);
      if (set.has(lapIndex)) {
        set.delete(lapIndex);
      } else {
        // Remove from other equipment first
        for (const [otherId, otherSet] of next) {
          if (otherId !== eqId) otherSet.delete(lapIndex);
        }
        set.add(lapIndex);
      }
      next.set(eqId, set);
      return next;
    });
  };

  const addEquipmentToSplit = () => {
    if (!newEquipmentId) return;
    setAssignments((prev) => {
      const next = new Map(prev);
      if (!next.has(newEquipmentId)) next.set(newEquipmentId, new Set());
      return next;
    });
    setNewEquipmentId("");
    setAddingEquipment(false);
  };

  const removeEquipment = (eqId: string) => {
    setAssignments((prev) => {
      const next = new Map(prev);
      next.delete(eqId);
      return next;
    });
  };

  // Save
  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === "full") {
        if (!fullEquipmentId) { setSaving(false); return; }
        await apiClient.put(`/equipment/session/${sessionId}/bulk`, {
          session_id: sessionId,
          athlete_id: athleteId,
          links: [{ equipment_id: fullEquipmentId, segment_type: "full", segment_km: totalKm, segment_min: Math.round(totalDurationMin) }],
        });
      } else {
        const links = equipmentSummaries
          .filter((s) => s.lapSet.size > 0)
          .map((s) => ({
            equipment_id: s.eqId,
            segment_type: "laps",
            segment_km: Math.round(s.km * 100) / 100,
            segment_min: Math.round(s.min),
            lap_indices: [...s.lapSet].sort((a, b) => a - b).join(","),
          }));
        await apiClient.put(`/equipment/session/${sessionId}/bulk`, {
          session_id: sessionId,
          athlete_id: athleteId,
          links,
        });
      }
      onClose();
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (!open) return null;

  const usedEquipmentIds = new Set(assignments.keys());
  const availableForAdd = sportEquipment.filter((e) => !usedEquipmentIds.has(e.id));

  return (
    <div data-testid="equipment-split-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-lg border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <h2 className="text-lg font-semibold text-foreground">Udstyr til dette pas</h2>
        <p className="mb-4 text-sm text-muted-foreground capitalize">{sport} · {totalKm.toFixed(1)} km · {laps.length} laps</p>

        {/* Mode toggle */}
        <div className="flex gap-3 mb-4">
          <button onClick={() => setMode("full")} className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${mode === "full" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}>
            Hele passet
          </button>
          <button onClick={() => setMode("split")} disabled={laps.length === 0} className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${mode === "split" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"} disabled:opacity-40`}>
            Opdelt paa laps
          </button>
        </div>

        {/* Full mode */}
        {mode === "full" && (
          <div className="space-y-3">
            <select value={fullEquipmentId} onChange={(e) => setFullEquipmentId(e.target.value)} className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              <option value="">Vaelg udstyr...</option>
              {sportEquipment.map((e) => (
                <option key={e.id} value={e.id}>{CATEGORY_ICONS[e.equipmentType] ?? "🎽"} {e.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Split mode */}
        {mode === "split" && (
          <div className="space-y-4">
            {/* Add equipment button */}
            <div className="flex gap-2">
              {addingEquipment ? (
                <>
                  <select value={newEquipmentId} onChange={(e) => setNewEquipmentId(e.target.value)} className="flex-1 max-w-xs rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground">
                    <option value="">Vaelg udstyr...</option>
                    {availableForAdd.map((e) => (
                      <option key={e.id} value={e.id}>{CATEGORY_ICONS[e.equipmentType] ?? "🎽"} {e.name}</option>
                    ))}
                  </select>
                  <button onClick={addEquipmentToSplit} disabled={!newEquipmentId} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">Tilfoej</button>
                  <button onClick={() => setAddingEquipment(false)} className="rounded p-1.5 text-muted-foreground hover:text-foreground"><X size={14} /></button>
                </>
              ) : (
                <button onClick={() => setAddingEquipment(true)} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <Plus size={12} /> Tilfoej udstyr
                </button>
              )}
            </div>

            {/* Lap assignment table */}
            {assignments.size > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Lap</th>
                      {equipmentSummaries.map((s) => (
                        <th key={s.eqId} className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                          <div className="flex flex-col items-center gap-1">
                            <span>{s.eq ? `${CATEGORY_ICONS[s.eq.equipmentType] ?? "🎽"} ${s.eq.name}` : s.eqId}</span>
                            <button onClick={() => removeEquipment(s.eqId)} className="text-[10px] text-red-400 hover:underline">Fjern</button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {laps.map((lap) => (
                      <tr key={lap.lapIndex} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="px-3 py-1.5 text-xs text-muted-foreground">{formatLapLabel(lap)}</td>
                        {equipmentSummaries.map((s) => (
                          <td key={s.eqId} className="px-3 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={s.lapSet.has(lap.lapIndex)}
                              onChange={() => toggleLap(s.eqId, lap.lapIndex)}
                              className="h-4 w-4 rounded border-border accent-primary"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 font-medium">
                      <td className="px-3 py-2 text-xs text-muted-foreground">Total</td>
                      {equipmentSummaries.map((s) => (
                        <td key={s.eqId} className="px-3 py-2 text-center text-xs">
                          <div>{s.km.toFixed(1)} km · {Math.round(s.min)} min</div>
                          <div className="text-muted-foreground">{s.lapSet.size} laps</div>
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Validation messages */}
            <div className="space-y-1">
              {unassignedLaps.length > 0 && assignments.size > 0 && (
                <div className="flex items-center gap-2 text-xs text-yellow-500">
                  <AlertTriangle size={12} />
                  {unassignedLaps.length} lap(s) uden udstyr: {unassignedLaps.join(", ")}
                </div>
              )}
              {kmMismatch && (
                <div className="flex items-center gap-2 text-xs text-yellow-500">
                  <AlertTriangle size={12} />
                  Tildelt distance ({assignedKm.toFixed(1)} km) matcher ikke passets total ({totalKm.toFixed(1)} km)
                </div>
              )}
              {unassignedLaps.length === 0 && !kmMismatch && assignments.size > 0 && (
                <div className="flex items-center gap-2 text-xs text-green-500">
                  <Check size={12} />
                  Alle laps er tildelt · {assignedKm.toFixed(1)} km matcher passet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Annuller</button>
          <button onClick={handleSave} disabled={saving || (mode === "full" && !fullEquipmentId) || (mode === "split" && assignments.size === 0)} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Gem
          </button>
        </div>
      </div>
    </div>
  );
}
