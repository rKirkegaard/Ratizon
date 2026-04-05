import { useAthleteStore } from "@/application/stores/athleteStore";
import {
  useAthleteProfile,
  useUpdateAthleteProfile,
} from "@/application/hooks/athlete/useAthleteProfile";
import AthleteProfile from "@/presentation/components/settings/AthleteProfile";
import ZoneColorPicker from "@/presentation/components/settings/ZoneColorPicker";
import SportConfigEditor from "@/presentation/components/settings/SportConfigEditor";
import GarminConnection from "@/presentation/components/settings/GarminConnection";

export default function SettingsPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);

  const { data: profileData, isLoading: profileLoading } =
    useAthleteProfile(athleteId);
  const updateProfileMutation = useUpdateAthleteProfile(athleteId);

  const profile = profileData?.data ?? null;

  // No athlete selected
  if (!athleteId) {
    return (
      <div data-testid="settings-page" className="mx-auto max-w-4xl p-4 md:p-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">
          Indstillinger
        </h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            Vaelg en atlet for at se indstillinger.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="settings-page" className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-foreground">Indstillinger</h1>

      {/* Athlete profile section */}
      <AthleteProfile
        profile={profile}
        isLoading={profileLoading}
        isSaving={updateProfileMutation.isPending}
        onSave={(payload) => updateProfileMutation.mutate(payload)}
      />

      {/* Zone colors section */}
      <ZoneColorPicker />

      {/* Sport disciplines section */}
      <SportConfigEditor athleteId={athleteId} />

      {/* Garmin Connect integration */}
      <GarminConnection athleteId={athleteId} />
    </div>
  );
}
