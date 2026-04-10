import { useAthleteStore } from "@/application/stores/athleteStore";
import ZoneColorPicker from "@/presentation/components/settings/ZoneColorPicker";
import SportConfigEditor from "@/presentation/components/settings/SportConfigEditor";
import GarminConnection from "@/presentation/components/settings/GarminConnection";

export default function SettingsPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);

  return (
    <div data-testid="settings-page" className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">App & Zoner</h1>
        <p className="text-sm text-muted-foreground">Zone-farver, sportdiscipliner og integrationer</p>
      </div>

      <ZoneColorPicker />

      {athleteId && <SportConfigEditor athleteId={athleteId} />}

      {athleteId && <GarminConnection athleteId={athleteId} />}

      {!athleteId && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">Vaelg en atlet for at se sportdiscipliner og integrationer.</p>
        </div>
      )}
    </div>
  );
}
