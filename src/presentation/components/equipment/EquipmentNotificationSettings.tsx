import { useState, useEffect } from "react";
import { Bell, Loader2 } from "lucide-react";
import { useNotificationPrefs, useUpsertNotificationPrefs } from "@/application/hooks/equipment/useEquipment";

interface EquipmentNotificationSettingsProps {
  athleteId: string;
  equipmentId: string;
  maxDistanceKm: number | null;
  maxDurationHours: number | null;
}

export default function EquipmentNotificationSettings({ athleteId, equipmentId, maxDistanceKm, maxDurationHours }: EquipmentNotificationSettingsProps) {
  const { data: prefsData, isLoading } = useNotificationPrefs(athleteId, equipmentId);
  const upsert = useUpsertNotificationPrefs(athleteId, equipmentId);
  const prefs = (prefsData as any)?.data ?? prefsData;

  const [distThreshold, setDistThreshold] = useState("");
  const [durThreshold, setDurThreshold] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (prefs) {
      setDistThreshold(prefs.distanceThresholdKm ? String(prefs.distanceThresholdKm) : maxDistanceKm ? String(Math.round(maxDistanceKm * 0.75)) : "");
      setDurThreshold(prefs.durationThresholdHours ? String(prefs.durationThresholdHours) : maxDurationHours ? String(Math.round(maxDurationHours * 0.75)) : "");
      setEnabled(prefs.enabled ?? true);
    }
  }, [prefs, maxDistanceKm, maxDurationHours]);

  const handleSave = () => {
    upsert.mutate({
      distanceThresholdKm: distThreshold ? Number(distThreshold) : null,
      durationThresholdHours: durThreshold ? Number(durThreshold) : null,
      enabled,
    });
  };

  if (isLoading) return <div className="h-16 animate-pulse rounded bg-muted" />;
  if (!maxDistanceKm && !maxDurationHours) return null;

  return (
    <div data-testid="equipment-notification-settings" className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-foreground">Notifikationsindstillinger</h4>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <div className="text-sm font-medium text-foreground">Advarsler aktiveret</div>
          <div className="text-xs text-muted-foreground">Faa besked naar udstyr naermer sig levetidsgraense</div>
        </div>
        <button onClick={() => setEnabled(!enabled)} className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${enabled ? "left-[18px]" : "left-0.5"}`} />
        </button>
      </div>
      {maxDistanceKm && (
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Advarsel ved (km)</label>
          <div className="flex items-center gap-2">
            <input type="number" value={distThreshold} onChange={(e) => setDistThreshold(e.target.value)} className="w-32 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground" />
            <span className="text-xs text-muted-foreground">af {maxDistanceKm} km</span>
          </div>
        </div>
      )}
      {maxDurationHours && (
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Advarsel ved (timer)</label>
          <div className="flex items-center gap-2">
            <input type="number" value={durThreshold} onChange={(e) => setDurThreshold(e.target.value)} className="w-32 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground" />
            <span className="text-xs text-muted-foreground">af {maxDurationHours} timer</span>
          </div>
        </div>
      )}
      <button onClick={handleSave} disabled={upsert.isPending} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
        {upsert.isPending && <Loader2 size={12} className="animate-spin" />}
        Gem indstillinger
      </button>
    </div>
  );
}
