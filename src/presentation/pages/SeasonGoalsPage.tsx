import { useAthleteStore } from "@/application/stores/athleteStore";
import {
  useGoals,
  useCreateGoal,
  useDeleteGoal,
  usePhases,
  useCreatePhase,
} from "@/application/hooks/planning/usePlanning";
import { useMesocycle } from "@/application/hooks/planning/useMesocycle";
import RaceCountdown from "@/presentation/components/planning/RaceCountdown";
import GoalsList from "@/presentation/components/planning/GoalsList";
import CTLProjection from "@/presentation/components/planning/CTLProjection";
import PhaseTable from "@/presentation/components/planning/PhaseTable";
import MesocycleTimeline from "@/presentation/components/planning/MesocycleTimeline";
import PhaseComplianceCards from "@/presentation/components/planning/PhaseComplianceCards";
import VolumeDistribution from "@/presentation/components/planning/VolumeDistribution";
import TaperSection from "@/presentation/components/planning/TaperSection";
import type { Goal } from "@/domain/types/planning.types";

export default function SeasonGoalsPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);

  const { data: goalsData, isLoading: goalsLoading } = useGoals(athleteId);
  const { data: phasesData, isLoading: phasesLoading } = usePhases(athleteId);
  const createGoalMutation = useCreateGoal(athleteId);
  const deleteGoalMutation = useDeleteGoal(athleteId);
  const createPhaseMutation = useCreatePhase(athleteId);
  const { data: mesocycleData, isLoading: mesocycleLoading } = useMesocycle(athleteId);

  const goals = goalsData?.data ?? [];
  const phases = phasesData?.data ?? [];

  // Find the main goal (A-priority race, soonest date)
  const mainGoal =
    goals
      .filter(
        (g) =>
          g.status === "active" &&
          g.racePriority === "A" &&
          g.targetDate &&
          new Date(g.targetDate) >= new Date()
      )
      .sort(
        (a, b) =>
          new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime()
      )[0] ?? null;

  // CTL estimation: find current phase's CTL target or use a default
  const now = new Date();
  const currentPhase = phases.find(
    (p) => new Date(p.startDate) <= now && new Date(p.endDate) >= now
  );
  const currentCTL = currentPhase?.ctlTarget
    ? Math.round(currentPhase.ctlTarget * 0.7)
    : 45;
  const targetCTL = mainGoal
    ? phases.find((p) => p.phaseType === "race")?.ctlTarget ?? 80
    : 80;
  const ctlGap = targetCTL - currentCTL;

  // No athlete selected
  if (!athleteId) {
    return (
      <div data-testid="season-goals-page" className="mx-auto max-w-5xl p-4 md:p-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">
          Saeson & Maal
        </h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            Vaelg en atlet for at se saesonplan og maal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="season-goals-page" className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-foreground">Saeson & Maal</h1>

      {/* Race countdown */}
      <RaceCountdown goal={mainGoal} isLoading={goalsLoading} />

      {/* Goals list */}
      <GoalsList
        goals={goals}
        isLoading={goalsLoading}
        onDelete={(id) => deleteGoalMutation.mutate(id)}
        onCreate={(goal) => createGoalMutation.mutate(goal)}
      />

      {/* CTL Projection chart */}
      <CTLProjection
        currentCTL={currentCTL}
        targetCTL={targetCTL}
        targetDate={mainGoal?.targetDate ?? null}
        isLoading={goalsLoading || phasesLoading}
      />

      {/* Mesocycle Timeline */}
      <MesocycleTimeline
        phases={mesocycleData?.phases ?? []}
        ctlTimeSeries={mesocycleData?.ctlTimeSeries ?? []}
        mainGoal={mesocycleData?.mainGoal ?? null}
        isLoading={mesocycleLoading}
      />

      {/* Phase Compliance Cards */}
      <PhaseComplianceCards
        phases={mesocycleData?.phaseCompliance ?? []}
        isLoading={mesocycleLoading}
      />

      {/* Volume Distribution */}
      <VolumeDistribution
        actuals={mesocycleData?.weeklyActuals ?? []}
        isLoading={mesocycleLoading}
      />

      {/* Taper Calculator */}
      {athleteId && mainGoal && (
        <TaperSection athleteId={athleteId} goalId={mainGoal.id} />
      )}

      {/* Training phases table */}
      <PhaseTable
        phases={phases}
        isLoading={phasesLoading}
        onCreatePhase={(phase) => createPhaseMutation.mutate(phase)}
      />

      {/* Gap analysis */}
      <div
        data-testid="gap-analysis"
        className="rounded-lg border border-border bg-card p-4"
      >
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Gap-analyse
        </h3>
        {goalsLoading || phasesLoading ? (
          <div className="h-12 animate-pulse rounded bg-muted" />
        ) : mainGoal ? (
          <div className="space-y-2 text-sm">
            {ctlGap > 0 ? (
              <p className="text-yellow-400">
                Du mangler ca. <strong>{ctlGap} CTL</strong> for at naa
                race-target ({targetCTL} CTL) til{" "}
                <strong>{mainGoal.title}</strong>.
              </p>
            ) : (
              <p className="text-green-400">
                Du er paa eller over dit CTL-maal ({targetCTL}) for{" "}
                <strong>{mainGoal.title}</strong>. Fokuser paa at holde formen!
              </p>
            )}
            {currentPhase && (
              <p className="text-muted-foreground">
                Nuvaerende fase:{" "}
                <strong>{currentPhase.phaseName}</strong>{" "}
                ({currentPhase.phaseType}) &mdash;{" "}
                {currentPhase.weeklyHoursTarget
                  ? `${currentPhase.weeklyHoursTarget} timer/uge`
                  : "Ingen volumenmaal"}
              </p>
            )}
            {!currentPhase && phases.length > 0 && (
              <p className="text-muted-foreground">
                Du er ikke i en aktiv traeningsfase. Tjek dine faser ovenfor.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Opret et A-maal for at se gap-analyse mod race-day.
          </p>
        )}
      </div>
    </div>
  );
}
