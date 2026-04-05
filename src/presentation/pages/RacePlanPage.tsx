import { useState } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useGoals } from "@/application/hooks/planning/usePlanning";
import {
  useRacePlans,
  useRacePlan,
  useRaceTimeline,
  useCreateRacePlan,
  useCreateNutritionItem,
  useDeleteNutritionItem,
} from "@/application/hooks/planning/useRacePlan";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { Plus, Trash2, Clock, Zap, Droplets, Flame } from "lucide-react";
import ExportPdfButton from "@/presentation/components/shared/ExportPdfButton";
import { exportRacePlanPdf } from "@/domain/utils/pdfExport";
import type { RaceSegment, SegmentType } from "@/domain/types/race-plan.types";

function formatTime(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "–";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTimeHM(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "–";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}t ${m}m` : `${m}m`;
}

const SEGMENT_COLORS: Record<string, string> = {
  swim: "#0EA5E9",
  t1: "#EAB308",
  bike: "#22C55E",
  t2: "#EAB308",
  run: "#F97316",
};

function SegmentBar({ segments, totalSec }: { segments: RaceSegment[]; totalSec: number }) {
  if (totalSec <= 0) return null;
  return (
    <div data-testid="race-segment-bar" className="flex h-8 w-full overflow-hidden rounded-lg">
      {segments.map((seg, i) => {
        const pct = (seg.durationSec / totalSec) * 100;
        if (pct <= 0) return null;
        return (
          <div
            key={i}
            className="flex items-center justify-center text-[10px] font-bold text-white"
            style={{
              width: `${pct}%`,
              backgroundColor: SEGMENT_COLORS[seg.type] || "#6B7280",
              minWidth: seg.type === "t1" || seg.type === "t2" ? "24px" : "40px",
            }}
          >
            {pct > 5 ? seg.label : ""}
          </div>
        );
      })}
    </div>
  );
}

export default function RacePlanPage() {
  const athleteId = useAthleteStore((s) => s.selectedAthleteId);
  const { data: goalsData } = useGoals(athleteId);
  const { data: plans, isLoading: plansLoading } = useRacePlans(athleteId);
  const createPlanMutation = useCreateRacePlan(athleteId);

  const goals = goalsData?.data ?? (Array.isArray(goalsData) ? goalsData : []);
  const mainGoal = (goals as any[]).find(
    (g: any) => g.status === "active" && g.racePriority === "A"
  );

  const activePlanId = plans?.[0]?.id ?? null;
  const { data: planDetail } = useRacePlan(athleteId, activePlanId);
  const { data: timeline } = useRaceTimeline(athleteId, activePlanId);
  const addNutrition = useCreateNutritionItem(athleteId, activePlanId);
  const deleteNutrition = useDeleteNutritionItem(athleteId, activePlanId);

  // Form state for creating plan
  const [showForm, setShowForm] = useState(false);
  const [swimPace, setSwimPace] = useState("110"); // 1:50/100m
  const [bikePace, setBikePace] = useState("108"); // ~33.3 km/h
  const [runPace, setRunPace] = useState("330"); // 5:30/km
  const [t1, setT1] = useState("120");
  const [t2, setT2] = useState("90");

  // Nutrition form
  const [showNutForm, setShowNutForm] = useState(false);
  const [nutSegment, setNutSegment] = useState<SegmentType>("bike");
  const [nutOffset, setNutOffset] = useState("20");
  const [nutItem, setNutItem] = useState("");
  const [nutCal, setNutCal] = useState("");
  const [nutFluid, setNutFluid] = useState("");

  if (!athleteId) {
    return (
      <div data-testid="race-plan-page" className="mx-auto max-w-5xl p-4 md:p-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Raceplan</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">Vaelg en atlet for at se raceplan.</p>
        </div>
      </div>
    );
  }

  const handleCreatePlan = () => {
    createPlanMutation.mutate({
      goalId: mainGoal?.id ?? null,
      swimPace: parseFloat(swimPace),
      bikePace: parseFloat(bikePace),
      runPace: parseFloat(runPace),
      t1Target: parseInt(t1),
      t2Target: parseInt(t2),
      nutritionStrategy: { caloriesPerHourBike: 300, caloriesPerHourRun: 200 },
      hydrationStrategy: { fluidPerHourMl: 750, sodiumPerHourMg: 500 },
    } as any, {
      onSuccess: () => setShowForm(false),
    });
  };

  const handleAddNutrition = () => {
    if (!nutItem.trim()) return;
    addNutrition.mutate({
      segmentType: nutSegment,
      timeOffsetMin: parseInt(nutOffset) || 0,
      item: nutItem,
      calories: nutCal ? parseInt(nutCal) : undefined,
      fluidMl: nutFluid ? parseInt(nutFluid) : undefined,
    }, {
      onSuccess: () => {
        setNutItem("");
        setNutCal("");
        setNutFluid("");
        setShowNutForm(false);
      },
    });
  };

  return (
    <div data-testid="race-plan-page" className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Raceplan</h1>
        <div className="flex items-center gap-3">
          {mainGoal && (
            <span className="text-sm text-muted-foreground">{mainGoal.title}</span>
          )}
          {timeline && (
            <ExportPdfButton
              onClick={() => exportRacePlanPdf(timeline, "Rasmus Mortensen", mainGoal?.title ?? "Ironman")}
            />
          )}
        </div>
      </div>

      {/* No plan yet */}
      {!plansLoading && (!plans || plans.length === 0) && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <p className="mb-4 text-sm text-muted-foreground">Ingen raceplan oprettet endnu.</p>
          <button
            data-testid="create-race-plan"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Opret raceplan
          </button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div data-testid="race-plan-form" className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="text-base font-semibold text-foreground">Ny Ironman Raceplan</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Svoem pace (s/100m)</label>
              <input value={swimPace} onChange={(e) => setSwimPace(e.target.value)} className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">T1 (sekunder)</label>
              <input value={t1} onChange={(e) => setT1(e.target.value)} className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Cykel pace (s/km)</label>
              <input value={bikePace} onChange={(e) => setBikePace(e.target.value)} className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">T2 (sekunder)</label>
              <input value={t2} onChange={(e) => setT2(e.target.value)} className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Loeb pace (s/km)</label>
              <input value={runPace} onChange={(e) => setRunPace(e.target.value)} className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreatePlan} disabled={createPlanMutation.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              Opret plan
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
              Annuller
            </button>
          </div>
        </div>
      )}

      {/* Plan detail */}
      {timeline && (
        <>
          {/* Segment timeline bar */}
          <SegmentBar segments={timeline.segments} totalSec={timeline.totalTimeSec} />

          {/* Total time */}
          <div className="flex items-center justify-center gap-2 text-lg font-bold text-foreground">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Estimeret total: {formatTime(timeline.totalTimeSec)}
          </div>

          {/* Segment cards */}
          <div data-testid="race-segments" className="grid gap-3 md:grid-cols-5">
            {timeline.segments.map((seg) => (
              <div
                key={seg.type}
                data-testid={`segment-${seg.type}`}
                className="rounded-lg border border-border bg-card p-4"
                style={{ borderTopColor: SEGMENT_COLORS[seg.type], borderTopWidth: "3px" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {seg.type !== "t1" && seg.type !== "t2" && (
                    <SportIcon sport={seg.type} size={18} />
                  )}
                  <span className="text-sm font-semibold text-foreground">{seg.label}</span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="text-lg font-bold text-foreground">{formatTime(seg.durationSec)}</p>
                  {seg.distance > 0 && <p>{(seg.distance / 1000).toFixed(1)} km</p>}
                  {seg.pace && <p>{seg.pace}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Nutrition totals */}
          <div data-testid="nutrition-totals" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
              <Flame className="h-5 w-5 text-orange-400" />
              <div>
                <p className="text-xs text-muted-foreground">Total kalorier</p>
                <p className="text-lg font-bold text-foreground">{timeline.totals.calories} kcal</p>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
              <Droplets className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-xs text-muted-foreground">Total vaeske</p>
                <p className="text-lg font-bold text-foreground">{timeline.totals.fluidMl} ml</p>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
              <Zap className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-xs text-muted-foreground">Kal/time (cykel)</p>
                <p className="text-lg font-bold text-foreground">{timeline.totals.caloriesPerHourBike}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
              <Zap className="h-5 w-5 text-orange-400" />
              <div>
                <p className="text-xs text-muted-foreground">Kal/time (loeb)</p>
                <p className="text-lg font-bold text-foreground">{timeline.totals.caloriesPerHourRun}</p>
              </div>
            </div>
          </div>

          {/* Nutrition schedule */}
          <div data-testid="nutrition-schedule" className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-foreground">Ernaeringsskema</h3>
              <button
                data-testid="add-nutrition"
                onClick={() => setShowNutForm(!showNutForm)}
                className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" /> Tilfoej
              </button>
            </div>

            {showNutForm && (
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-md bg-muted/30 p-3 md:grid-cols-6">
                <select value={nutSegment} onChange={(e) => setNutSegment(e.target.value as SegmentType)} className="rounded border border-border bg-background px-2 py-1.5 text-xs">
                  <option value="bike">Cykel</option>
                  <option value="run">Loeb</option>
                  <option value="swim">Svoem</option>
                  <option value="t1">T1</option>
                  <option value="t2">T2</option>
                </select>
                <input placeholder="Min fra start" value={nutOffset} onChange={(e) => setNutOffset(e.target.value)} className="rounded border border-border bg-background px-2 py-1.5 text-xs" />
                <input placeholder="Produkt" value={nutItem} onChange={(e) => setNutItem(e.target.value)} className="rounded border border-border bg-background px-2 py-1.5 text-xs" />
                <input placeholder="Kalorier" value={nutCal} onChange={(e) => setNutCal(e.target.value)} className="rounded border border-border bg-background px-2 py-1.5 text-xs" />
                <input placeholder="Vaeske (ml)" value={nutFluid} onChange={(e) => setNutFluid(e.target.value)} className="rounded border border-border bg-background px-2 py-1.5 text-xs" />
                <button onClick={handleAddNutrition} disabled={addNutrition.isPending} className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  Gem
                </button>
              </div>
            )}

            {timeline.nutritionTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen ernaeringspunkter tilfojet endnu.</p>
            ) : (
              <div className="space-y-1">
                {timeline.nutritionTimeline.map((ni) => (
                  <div key={ni.id} className="flex items-center justify-between rounded-md bg-muted/20 px-3 py-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: SEGMENT_COLORS[ni.segmentType] }}
                      >
                        {ni.segmentType.toUpperCase()}
                      </span>
                      <span className="text-muted-foreground">{formatTimeHM(ni.raceClockMin * 60)}</span>
                      <span className="font-medium text-foreground">{ni.item}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {ni.calories && <span>{ni.calories} kcal</span>}
                      {ni.fluidMl && <span>{ni.fluidMl} ml</span>}
                      <button
                        onClick={() => deleteNutrition.mutate(ni.id)}
                        className="text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
