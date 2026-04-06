import { useAthleteStore } from "@/application/stores/athleteStore";
import { useSessions } from "@/application/hooks/training/useSessions";
import StrengthOverview from "@/presentation/components/discipline/StrengthOverview";
import { SportIcon } from "@/presentation/components/shared/SportIcon";

export default function StrengthPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);

  const { data: sessionsData, isLoading } = useSessions(
    athleteId,
    "all",
    "strength"
  );

  if (!athleteId) {
    return (
      <div data-testid="strength-page" className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            Vaelg en atlet for at se styrkedata.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="strength-page" className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <SportIcon sport="strength" size={28} />
        <h1 className="text-2xl font-bold text-foreground">Styrke</h1>
      </div>

      <StrengthOverview
        sessions={sessionsData?.sessions ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
