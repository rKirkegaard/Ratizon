import { useAthleteStore } from "@/application/stores/athleteStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import {
  useGoals,
  useCreateGoal,
  useDeleteGoal,
  useUpdateGoal,
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
import PerformancePipeline from "@/presentation/components/planning/PerformancePipeline";
import ThresholdProgressionCard from "@/presentation/components/planning/ThresholdProgressionCard";
import { useCTLEstimate } from "@/application/hooks/planning/useCTLEstimate";
import { useAthleteProfile } from "@/application/hooks/athlete/useAthleteProfile";
import { parseMssToPaceSec } from "@/domain/utils/paceUtils";
import type { Goal } from "@/domain/types/planning.types";

export default function SeasonGoalsPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);

  const { data: goalsData, isLoading: goalsLoading } = useGoals(athleteId);
  const { data: phasesData, isLoading: phasesLoading } = usePhases(athleteId);
  const createGoalMutation = useCreateGoal(athleteId);
  const deleteGoalMutation = useDeleteGoal(athleteId);
  const updateGoalMutation = useUpdateGoal(athleteId);
  const createPhaseMutation = useCreatePhase(athleteId);
  const { data: mesocycleData, isLoading: mesocycleLoading } = useMesocycle(athleteId);
  const { data: profileRes } = useAthleteProfile(athleteId);
  const athleteProfile = (profileRes as any)?.data ?? profileRes;
  const queryClient = useQueryClient();
  const recalcPmc = useMutation({
    mutationFn: () => apiClient.post(`/analytics/${athleteId}/pmc/recalculate`, { sport: "all" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mesocycle", athleteId] });
      queryClient.invalidateQueries({ queryKey: ["pmc", athleteId] });
    },
    onError: (err) => console.error("PMC recalculate failed:", err),
  });

  const goals = (goalsData?.data ?? (Array.isArray(goalsData) ? goalsData : [])) as Goal[];
  const phases = phasesData?.data ?? (Array.isArray(phasesData) ? phasesData : []);

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

  // CTL: use real data from mesocycle
  const now = new Date();
  const currentPhase = phases.find(
    (p) => new Date(p.startDate) <= now && new Date(p.endDate) >= now
  );
  const ctlTimeSeries = mesocycleData?.ctlTimeSeries ?? [];
  const currentCTL = ctlTimeSeries.length > 0
    ? Math.round(ctlTimeSeries[ctlTimeSeries.length - 1].ctl)
    : 0;
  const targetCTL = mainGoal
    ? phases.find((p) => p.phaseType === "race")?.ctlTarget ?? 80
    : 80;
  const ctlGap = targetCTL - currentCTL;

  // CTL estimate from race target time
  const { data: ctlEstimate } = useCTLEstimate(athleteId, mainGoal?.id ?? null);

  // No athlete selected
  if (!athleteId) {
    return (
      <div data-testid="season-goals-page" className="p-4 md:p-6">
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
    <div data-testid="season-goals-page" className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-foreground">Saeson & Maal</h1>

      {/* Race countdown */}
      <RaceCountdown goal={mainGoal} isLoading={goalsLoading} />

      {/* Goals list */}
      <GoalsList
        goals={goals}
        isLoading={goalsLoading}
        onDelete={(id) => deleteGoalMutation.mutate(id)}
        onCreate={(goal) => createGoalMutation.mutate(goal)}
        onUpdate={(goal) => updateGoalMutation.mutate(goal)}
      />

      {/* Performance Pipeline */}
      {ctlEstimate && <PerformancePipeline estimate={ctlEstimate} />}

      {/* Threshold Progression — where should baselines be today? */}
      {ctlEstimate && mainGoal?.targetDate && athleteProfile && (
        <ThresholdProgressionCard
          currentBaselines={{
            ftp: athleteProfile.ftp ?? 0,
            runPaceSec: parseMssToPaceSec(athleteProfile.runThresholdPace) ?? 0,
            swimCssSec: athleteProfile.swimCss ?? 0,
          }}
          requiredThresholds={ctlEstimate.derivedThresholds}
          trainingStartDate={phases.length > 0 ? phases[0].startDate : mainGoal.createdAt ?? mainGoal.targetDate}
          raceDate={mainGoal.targetDate}
        />
      )}

      {/* CTL Projection chart */}
      <CTLProjection
        ctlTimeSeries={ctlTimeSeries}
        targetCTL={targetCTL}
        derivedCTL={ctlEstimate?.requiredCTL ?? null}
        targetDate={mainGoal?.targetDate ?? null}
        phases={phases.map((p: any) => ({
          phaseType: p.phaseType,
          startDate: p.startDate,
          endDate: p.endDate,
          ctlTarget: p.ctlTarget,
        }))}
        isLoading={goalsLoading || mesocycleLoading}
        onRecalculate={() => recalcPmc.mutate()}
        isRecalculating={recalcPmc.isPending}
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
        suggestedTargets={ctlEstimate?.phaseTargets}
      />

      {/* Gap analysis */}
      <div
        data-testid="gap-analysis"
        className="rounded-lg border border-border bg-card p-4"
      >
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Gap-analyse
        </h3>
        {goalsLoading || phasesLoading ? (
          <div className="h-12 animate-pulse rounded bg-muted" />
        ) : mainGoal ? (
          <div className="space-y-3">
            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs text-muted-foreground">Nuvaerende CTL</p>
                <p className="text-lg font-bold text-foreground">{currentCTL}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs text-muted-foreground">{ctlEstimate ? "Krav (afledt)" : "Maal (manuelt)"}</p>
                <p className={`text-lg font-bold ${ctlEstimate ? "text-emerald-400" : "text-foreground"}`}>
                  {ctlEstimate?.requiredCTL ?? targetCTL}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs text-muted-foreground">Gap</p>
                <p className={`text-lg font-bold ${(ctlEstimate?.ctlGap ?? ctlGap) > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                  {ctlEstimate?.ctlGap ?? ctlGap} CTL
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs text-muted-foreground">Ramp-rate</p>
                <p className="text-lg font-bold text-foreground">
                  {ctlEstimate ? `+${ctlEstimate.requiredRampRate}/uge` : "–"}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            {(() => {
              const target = ctlEstimate?.requiredCTL ?? targetCTL;
              const pct = target > 0 ? Math.min(100, Math.round((currentCTL / target) * 100)) : 0;
              return (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>{pct}% af maal</span>
                    <span>{currentCTL} / {target}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-accent">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Context text */}
            {currentPhase && (
              <p className="text-xs text-muted-foreground">
                Nuvaerende fase: <strong>{currentPhase.phaseName}</strong> ({currentPhase.phaseType})
                {currentPhase.weeklyHoursTarget ? ` — ${currentPhase.weeklyHoursTarget} timer/uge` : ""}
              </p>
            )}
            {ctlEstimate && ctlEstimate.requiredRampRate > 8 && (
              <p className="text-xs text-red-400">
                Den kraevede ramp-rate ({ctlEstimate.requiredRampRate}/uge) er hoej. Overvej at justere maaltiden eller flytte racedatoen.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Opret et A-maal med en maaltid for at se gap-analyse mod race-day.
          </p>
        )}
      </div>
    </div>
  );
}
