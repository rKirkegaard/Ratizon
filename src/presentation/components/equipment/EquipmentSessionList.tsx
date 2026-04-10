import { useState } from "react";
import { useEquipmentSessions } from "@/application/hooks/equipment/useEquipment";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { CATEGORY_ICONS } from "@/domain/constants/equipmentCategories";

interface EquipmentSessionListProps {
  athleteId: string;
  equipmentId: string;
}

function formatLapIndices(lapIndices: string): string {
  const indices = lapIndices.split(",").map(Number).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = indices[0], end = indices[0];
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] === end + 1) end = indices[i];
    else { ranges.push(start === end ? `${start}` : `${start}-${end}`); start = indices[i]; end = indices[i]; }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return `Lap ${ranges.join(", ")}`;
}

export default function EquipmentSessionList({ athleteId, equipmentId }: EquipmentSessionListProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useEquipmentSessions(athleteId, equipmentId, page);

  // Handle auto-unwrap: data may be the response object or already unwrapped
  const rows = (data as any)?.data ?? (Array.isArray(data) ? data : []);
  const total = (data as any)?.total ?? rows.length;
  const limit = (data as any)?.limit ?? 20;
  const totalPages = Math.ceil(total / limit) || 1;

  if (isLoading) return <div className="flex items-center gap-2 py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Henter sessioner...</span></div>;

  if (rows.length === 0) return <p className="text-xs text-muted-foreground py-4">Ingen sessioner med dette udstyr.</p>;

  return (
    <div data-testid="equipment-session-list">
      <div className="space-y-1">
        {rows.map((s: any, i: number) => (
          <div key={i} className="flex items-center justify-between rounded border border-border/40 px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{new Date(s.startedAt).toLocaleDateString("da-DK")}</span>
              <span className="text-foreground">{s.title || s.sport}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {s.segmentKm != null && <span>{s.segmentKm.toFixed(1)} km</span>}
              {s.lapIndices && <span>{formatLapIndices(s.lapIndices)}</span>}
              <span className="uppercase">{s.sport}</span>
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronLeft size={16} /></button>
          <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
