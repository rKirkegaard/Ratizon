import { useParams } from "react-router-dom";
import { useAthleteStore } from "@/application/stores/athleteStore";
import RunningPage from "@/presentation/pages/RunningPage";
import CyclingPage from "@/presentation/pages/CyclingPage";
import SwimmingPage from "@/presentation/pages/SwimmingPage";
import StrengthPage from "@/presentation/pages/StrengthPage";
import { SportIcon } from "@/presentation/components/shared/SportIcon";

const SPECIFIC_PAGES: Record<string, React.ComponentType> = {
  run: RunningPage,
  bike: CyclingPage,
  swim: SwimmingPage,
  strength: StrengthPage,
};

export default function DisciplinePage() {
  const { sportKey } = useParams<{ sportKey: string }>();
  const sportConfigs = useAthleteStore((s) => s.sportConfigs);

  if (!sportKey) {
    return (
      <div data-testid="discipline-page-not-found">
        <h1 className="text-2xl font-bold">Disciplin ikke fundet</h1>
      </div>
    );
  }

  const config = sportConfigs.find((c) => c.sport_key === sportKey && c.is_active);

  // Delegate to specific page component if one exists
  const SpecificPage = SPECIFIC_PAGES[sportKey];
  if (SpecificPage) {
    return <SpecificPage />;
  }

  // Generic discipline page for sports without a dedicated component
  const displayName = config?.display_name ?? sportKey;

  return (
    <div data-testid="discipline-page" data-sport={sportKey}>
      <div className="mb-6 flex items-center gap-3">
        <SportIcon sport={sportKey} size={28} />
        <h1 className="text-2xl font-bold">{displayName}</h1>
      </div>
      <div
        data-testid="discipline-page-content"
        className="rounded-lg border border-border bg-card p-6"
      >
        <p className="text-muted-foreground">
          Traeningsdata for {displayName} vises her.
        </p>
      </div>
    </div>
  );
}
