import { useState, useCallback } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useGoals } from "@/application/hooks/planning/usePlanning";
import {
  useRacePlans,
  useRacePlan,
  useRaceTimeline,
  useCreateRacePlan,
  useUpdateRacePlan,
  useCreateNutritionItem,
  useDeleteNutritionItem,
} from "@/application/hooks/planning/useRacePlan";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import { Plus, Trash2, Clock, Zap, Droplets, Flame, Pencil, Check } from "lucide-react";
import ExportPdfButton from "@/presentation/components/shared/ExportPdfButton";
import { exportRacePlanPdf } from "@/domain/utils/pdfExport";
import type { RacePlan, RaceSegment, SegmentType } from "@/domain/types/race-plan.types";

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

  const RACE_TYPES = [
    { value: "sprint", label: "Sprint (750/20/5)" },
    { value: "olympic", label: "Olympisk (1.5/40/10)" },
    { value: "half", label: "Halv Ironman (1.9/90/21)" },
    { value: "full", label: "Ironman (3.8/180/42)" },
    { value: "custom", label: "Brugerdefineret" },
  ];

  // Form state for creating plan — user-friendly formats
  const [showForm, setShowForm] = useState(false);
  const [raceType, setRaceType] = useState("full");
  const [swimPace, setSwimPace] = useState("1:50");   // M:SS per 100m
  const [bikePace, setBikePace] = useState("33.3");    // km/h
  const [runPace, setRunPace] = useState("5:30");      // M:SS per km
  const [t1, setT1] = useState("2:00");               // M:SS
  const [t2, setT2] = useState("1:30");               // M:SS

  /** Parse M:SS string to total seconds */
  function parseMSS(str: string): number {
    const parts = str.trim().split(":").map(Number);
    if (parts.length === 2 && parts.every((n) => !isNaN(n))) return parts[0] * 60 + parts[1];
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  /** Convert km/h to seconds per km */
  function kmhToSecPerKm(kmh: number): number {
    if (kmh <= 0) return 0;
    return 3600 / kmh;
  }

  /** Convert seconds per km to km/h */
  function secPerKmToKmh(spk: number): number {
    if (spk <= 0) return 0;
    return 3600 / spk;
  }

  /** Seconds → M:SS display */
  function secsToMSS(secs: number | null): string {
    if (!secs || secs <= 0) return "";
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  /** Seconds → HH:MM:SS display */
  function secsToHMS(secs: number | null): string {
    if (!secs || secs <= 0) return "";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.round(secs % 60);
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // ── Edit state ──────────────────────────────────────────────────────
  const updatePlanMutation = useUpdateRacePlan(athleteId, activePlanId);
  const [editing, setEditing] = useState(false);
  const [editSwimPace, setEditSwimPace] = useState("");
  const [editSwimTime, setEditSwimTime] = useState("");
  const [editBikeKmh, setEditBikeKmh] = useState("");
  const [editBikeTime, setEditBikeTime] = useState("");
  const [editRunPace, setEditRunPace] = useState("");
  const [editRunTime, setEditRunTime] = useState("");
  const [editT1, setEditT1] = useState("");
  const [editT2, setEditT2] = useState("");
  // Track original values to detect what the user actually changed
  const [origValues, setOrigValues] = useState({ swimPace: "", swimTime: "", bikeKmh: "", bikeTime: "", runPace: "", runTime: "", t1: "", t2: "" });

  const populateEditFields = useCallback((plan: RacePlan | undefined, _tl: typeof timeline) => {
    if (!plan || !_tl) return;
    const sp = secsToMSS(plan.swimPace);
    const st = secsToHMS(plan.targetSwimTime);
    const bk = plan.bikePace ? secPerKmToKmh(plan.bikePace).toFixed(1) : "";
    const bt = secsToHMS(plan.targetBikeTime);
    const rp = secsToMSS(plan.runPace);
    const rt = secsToHMS(plan.targetRunTime);
    const t1v = secsToMSS(plan.t1Target);
    const t2v = secsToMSS(plan.t2Target);
    setEditSwimPace(sp); setEditSwimTime(st);
    setEditBikeKmh(bk); setEditBikeTime(bt);
    setEditRunPace(rp); setEditRunTime(rt);
    setEditT1(t1v); setEditT2(t2v);
    setOrigValues({ swimPace: sp, swimTime: st, bikeKmh: bk, bikeTime: bt, runPace: rp, runTime: rt, t1: t1v, t2: t2v });
  }, []);

  const startEditing = () => {
    populateEditFields(planDetail as RacePlan | undefined, timeline);
    setEditing(true);
  };

  /** Parse H:MM:SS string to seconds */
  function parseTimeSec(str: string): number {
    const parts = str.trim().split(":").map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  }

  const saveEditing = () => {
    if (!timeline) return;
    const payload: Record<string, unknown> = {};
    const o = origValues;

    // Get distances from current timeline segments
    const swimDist = timeline.segments.find((s) => s.type === "swim")?.distance ?? 3800;
    const bikeDist = timeline.segments.find((s) => s.type === "bike")?.distance ?? 180000;
    const runDist = timeline.segments.find((s) => s.type === "run")?.distance ?? 42195;

    // Swim: if pace changed → use pace; else if time changed → derive pace from time
    const swimPaceChanged = editSwimPace !== o.swimPace;
    const swimTimeChanged = editSwimTime !== o.swimTime;
    if (swimPaceChanged) {
      const v = parseMSS(editSwimPace);
      if (v > 0) payload.swimPace = v;
    } else if (swimTimeChanged) {
      const t = parseTimeSec(editSwimTime);
      if (t > 0 && swimDist > 0) payload.swimPace = t / (swimDist / 100);
    }

    // Bike: if km/h changed → use km/h; else if time changed → derive pace from time
    const bikePaceChanged = editBikeKmh !== o.bikeKmh;
    const bikeTimeChanged = editBikeTime !== o.bikeTime;
    if (bikePaceChanged) {
      const v = parseFloat(editBikeKmh);
      if (v > 0) payload.bikePace = kmhToSecPerKm(v);
    } else if (bikeTimeChanged) {
      const t = parseTimeSec(editBikeTime);
      if (t > 0 && bikeDist > 0) payload.bikePace = t / (bikeDist / 1000);
    }

    // Run: if pace changed → use pace; else if time changed → derive pace from time
    const runPaceChanged = editRunPace !== o.runPace;
    const runTimeChanged = editRunTime !== o.runTime;
    if (runPaceChanged) {
      const v = parseMSS(editRunPace);
      if (v > 0) payload.runPace = v;
    } else if (runTimeChanged) {
      const t = parseTimeSec(editRunTime);
      if (t > 0 && runDist > 0) payload.runPace = t / (runDist / 1000);
    }

    // T1 / T2
    if (editT1 !== o.t1) {
      const v = parseMSS(editT1);
      if (v > 0) payload.t1Target = v;
    }
    if (editT2 !== o.t2) {
      const v = parseMSS(editT2);
      if (v > 0) payload.t2Target = v;
    }

    updatePlanMutation.mutate(payload as Partial<RacePlan>, {
      onSuccess: () => setEditing(false),
    });
  };

  // Nutrition form
  const [showNutForm, setShowNutForm] = useState(false);
  const [nutSegment, setNutSegment] = useState<SegmentType>("bike");
  const [nutOffset, setNutOffset] = useState("20");
  const [nutItem, setNutItem] = useState("");
  const [nutCal, setNutCal] = useState("");
  const [nutFluid, setNutFluid] = useState("");

  if (!athleteId) {
    return (
      <div data-testid="race-plan-page" className="p-4 md:p-6">
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
      raceType,
      swimPace: parseMSS(swimPace),                // M:SS → seconds per 100m
      bikePace: kmhToSecPerKm(parseFloat(bikePace)), // km/h → seconds per km
      runPace: parseMSS(runPace),                   // M:SS → seconds per km
      t1Target: parseMSS(t1),                       // M:SS → seconds
      t2Target: parseMSS(t2),                       // M:SS → seconds
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

  // ── Scenario tabs ────────────────────────────────────────────────────
  type ScenarioKey = "A" | "B" | "C";
  const SCENARIO_LABELS: Record<ScenarioKey, { label: string; desc: string }> = {
    A: { label: "Plan A", desc: "God dag" },
    B: { label: "Plan B", desc: "Normal dag" },
    C: { label: "Plan C", desc: "Overlevelse" },
  };
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("A");

  /** Compute segment times from pace+distance for a scenario */
  function computeScenarioTimeline(paces: { swimPace: number | null; bikePace: number | null; runPace: number | null; t1Target: number | null; t2Target: number | null }, distances: { swim: number; bike: number; run: number }) {
    const swimSec = paces.swimPace ? Math.round((distances.swim / 100) * paces.swimPace) : 0;
    const bikeSec = paces.bikePace ? Math.round((distances.bike / 1000) * paces.bikePace) : 0;
    const runSec = paces.runPace ? Math.round((distances.run / 1000) * paces.runPace) : 0;
    const t1Sec = paces.t1Target ?? 120;
    const t2Sec = paces.t2Target ?? 90;
    let clock = 0;
    const segs: RaceSegment[] = [
      { type: "swim", label: "Svoemning", distance: distances.swim, startSec: (clock), durationSec: swimSec, pace: paces.swimPace ? `${Math.floor(paces.swimPace / 60)}:${String(Math.round(paces.swimPace % 60)).padStart(2, "0")}/100m` : null },
      { type: "t1", label: "T1", distance: 0, startSec: (clock += swimSec), durationSec: t1Sec, pace: null },
      { type: "bike", label: "Cykling", distance: distances.bike, startSec: (clock += t1Sec), durationSec: bikeSec, pace: paces.bikePace && bikeSec > 0 ? `${Math.round(distances.bike / 1000 / (bikeSec / 3600))} km/t` : null },
      { type: "t2", label: "T2", distance: 0, startSec: (clock += bikeSec), durationSec: t2Sec, pace: null },
      { type: "run", label: "Loeb", distance: distances.run, startSec: (clock += t2Sec), durationSec: runSec, pace: paces.runPace ? `${Math.floor(paces.runPace / 60)}:${String(Math.round(paces.runPace % 60)).padStart(2, "0")}/km` : null },
    ];
    return {
      segments: segs,
      totalTimeSec: swimSec + t1Sec + bikeSec + t2Sec + runSec,
    };
  }

  // Get scenario data: A = from timeline, B/C = computed from stored scenarios
  const plan = planDetail as RacePlan | undefined;
  const scenarioData = activeScenario === "A" ? timeline : (() => {
    if (!plan?.scenarios || !timeline) return null;
    const sc = (plan.scenarios as Record<string, any>)[activeScenario];
    if (!sc) return null;
    const distances = {
      swim: timeline.segments.find((s) => s.type === "swim")?.distance ?? 3800,
      bike: timeline.segments.find((s) => s.type === "bike")?.distance ?? 180000,
      run: timeline.segments.find((s) => s.type === "run")?.distance ?? 42195,
    };
    return { ...computeScenarioTimeline(sc, distances), nutritionTimeline: timeline.nutritionTimeline, totals: timeline.totals };
  })();

  // Editing scenarios B/C
  const [editingScenario, setEditingScenario] = useState<ScenarioKey | null>(null);
  const [scnSwimPace, setScnSwimPace] = useState("");
  const [scnBikeKmh, setScnBikeKmh] = useState("");
  const [scnRunPace, setScnRunPace] = useState("");
  const [scnT1, setScnT1] = useState("");
  const [scnT2, setScnT2] = useState("");

  function startScenarioEdit(key: ScenarioKey) {
    const sc = (plan?.scenarios as Record<string, any>)?.[key];
    if (sc) {
      setScnSwimPace(secsToMSS(sc.swimPace));
      setScnBikeKmh(sc.bikePace ? secPerKmToKmh(sc.bikePace).toFixed(1) : "");
      setScnRunPace(secsToMSS(sc.runPace));
      setScnT1(secsToMSS(sc.t1Target));
      setScnT2(secsToMSS(sc.t2Target));
    } else {
      // Default: Plan A values + 5%/10% slower
      const factor = key === "B" ? 1.05 : 1.12;
      setScnSwimPace(secsToMSS(plan?.swimPace ? Math.round(plan.swimPace * factor) : null));
      setScnBikeKmh(plan?.bikePace ? secPerKmToKmh(plan.bikePace / factor).toFixed(1) : "");
      setScnRunPace(secsToMSS(plan?.runPace ? Math.round(plan.runPace * factor) : null));
      setScnT1(secsToMSS(plan?.t1Target ?? null));
      setScnT2(secsToMSS(plan?.t2Target ?? null));
    }
    setEditingScenario(key);
  }

  function saveScenario() {
    if (!editingScenario || !plan) return;
    const existing = (plan.scenarios as Record<string, any>) ?? {};
    const updated = {
      ...existing,
      [editingScenario]: {
        label: SCENARIO_LABELS[editingScenario].desc,
        swimPace: parseMSS(scnSwimPace) || null,
        bikePace: kmhToSecPerKm(parseFloat(scnBikeKmh) || 0) || null,
        runPace: parseMSS(scnRunPace) || null,
        t1Target: parseMSS(scnT1) || null,
        t2Target: parseMSS(scnT2) || null,
      },
    };
    updatePlanMutation.mutate({ scenarios: updated } as Partial<RacePlan>, {
      onSuccess: () => setEditingScenario(null),
    });
  }

  return (
    <div data-testid="race-plan-page" className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Raceplan</h1>
        <div className="flex items-center gap-3">
          {mainGoal && (
            <div className="text-right">
              <span className="text-sm text-muted-foreground">{mainGoal.title}</span>
              {mainGoal.raceTargetTime != null && mainGoal.raceTargetTime > 0 && (
                <span className="ml-2 rounded bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                  Maal: {formatTime(mainGoal.raceTargetTime)}
                </span>
              )}
            </div>
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
          <h3 className="text-base font-semibold text-foreground">Ny Raceplan</h3>
          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-1">Race-type</label>
            <select
              data-testid="race-type-select"
              value={raceType}
              onChange={(e) => setRaceType(e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring md:w-auto"
            >
              {RACE_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Svoem (M:SS/100m)</label>
              <input value={swimPace} onChange={(e) => setSwimPace(e.target.value)} placeholder="1:50" className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">T1 (M:SS)</label>
              <input value={t1} onChange={(e) => setT1(e.target.value)} placeholder="2:00" className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Cykel (km/t)</label>
              <input value={bikePace} onChange={(e) => setBikePace(e.target.value)} placeholder="33.3" className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">T2 (M:SS)</label>
              <input value={t2} onChange={(e) => setT2(e.target.value)} placeholder="1:30" className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Loeb (M:SS/km)</label>
              <input value={runPace} onChange={(e) => setRunPace(e.target.value)} placeholder="5:30" className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
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
          {/* Scenario tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
            {(["A", "B", "C"] as ScenarioKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveScenario(key)}
                className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                  activeScenario === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {SCENARIO_LABELS[key].label}
                <span className="ml-1 hidden text-[10px] opacity-70 sm:inline">({SCENARIO_LABELS[key].desc})</span>
              </button>
            ))}
          </div>

          {/* Scenario B/C: edit or create */}
          {activeScenario !== "A" && !scenarioData && !editingScenario && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8">
              <p className="mb-3 text-sm text-muted-foreground">
                {SCENARIO_LABELS[activeScenario].label} ({SCENARIO_LABELS[activeScenario].desc}) er ikke oprettet endnu.
              </p>
              <button
                onClick={() => startScenarioEdit(activeScenario)}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Opret {SCENARIO_LABELS[activeScenario].label}
              </button>
            </div>
          )}

          {/* Scenario edit form */}
          {editingScenario && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{SCENARIO_LABELS[editingScenario].label} — {SCENARIO_LABELS[editingScenario].desc}</h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Svoem (M:SS/100m)</label>
                  <input value={scnSwimPace} onChange={(e) => setScnSwimPace(e.target.value)} placeholder="1:50" className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">T1 (M:SS)</label>
                  <input value={scnT1} onChange={(e) => setScnT1(e.target.value)} placeholder="2:00" className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Cykel (km/t)</label>
                  <input value={scnBikeKmh} onChange={(e) => setScnBikeKmh(e.target.value)} placeholder="33.3" className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">T2 (M:SS)</label>
                  <input value={scnT2} onChange={(e) => setScnT2(e.target.value)} placeholder="1:30" className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Loeb (M:SS/km)</label>
                  <input value={scnRunPace} onChange={(e) => setScnRunPace(e.target.value)} placeholder="5:30" className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveScenario} disabled={updatePlanMutation.isPending} className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Gem</button>
                <button onClick={() => setEditingScenario(null)} className="rounded-md border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground">Annuller</button>
              </div>
            </div>
          )}

          {/* Segment timeline bar + total time + edit (only when scenarioData exists) */}
          {scenarioData && (
            <>
              <SegmentBar segments={scenarioData.segments} totalSec={scenarioData.totalTimeSec} />

              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Estimeret total: {formatTime(scenarioData.totalTimeSec)}
                </div>
                {activeScenario === "A" && !editing ? (
                  <button
                    data-testid="edit-race-plan"
                    onClick={startEditing}
                    className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Rediger
                  </button>
                ) : activeScenario === "A" && editing ? (
                  <button
                    data-testid="save-race-plan"
                    onClick={saveEditing}
                    disabled={updatePlanMutation.isPending}
                    className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Gem
                  </button>
                ) : activeScenario !== "A" && !editingScenario ? (
                  <button
                    onClick={() => startScenarioEdit(activeScenario)}
                    className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Rediger
                  </button>
                ) : null}
              </div>
            </>
          )}

          {/* Segment cards — editable */}
          {scenarioData && (
          <div data-testid="race-segments" className="grid gap-3 md:grid-cols-5">
            {scenarioData.segments.map((seg) => {
              const isTransition = seg.type === "t1" || seg.type === "t2";
              return (
                <div
                  key={seg.type}
                  data-testid={`segment-${seg.type}`}
                  className="rounded-lg border border-border bg-card p-4"
                  style={{ borderTopColor: SEGMENT_COLORS[seg.type], borderTopWidth: "3px" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {!isTransition && <SportIcon sport={seg.type} size={18} />}
                    <span className="text-sm font-semibold text-foreground">{seg.label}</span>
                  </div>

                  {!editing ? (
                    /* ── Read-only view ── */
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="text-lg font-bold text-foreground">{formatTime(seg.durationSec)}</p>
                      {seg.distance > 0 && <p>{(seg.distance / 1000).toFixed(1)} km</p>}
                      {seg.pace && <p>{seg.pace}</p>}
                    </div>
                  ) : (
                    /* ── Edit view ── */
                    <div className="space-y-2">
                      {/* Time */}
                      <div>
                        <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                          {isTransition ? "Tid (M:SS)" : "Tid (H:MM:SS)"}
                        </label>
                        <input
                          value={
                            seg.type === "swim" ? editSwimTime :
                            seg.type === "bike" ? editBikeTime :
                            seg.type === "run" ? editRunTime :
                            seg.type === "t1" ? editT1 : editT2
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (seg.type === "swim") setEditSwimTime(v);
                            else if (seg.type === "bike") setEditBikeTime(v);
                            else if (seg.type === "run") setEditRunTime(v);
                            else if (seg.type === "t1") setEditT1(v);
                            else setEditT2(v);
                          }}
                          placeholder={isTransition ? "2:00" : "1:05:00"}
                          className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      {/* Pace — only for swim/bike/run */}
                      {!isTransition && (
                        <div>
                          <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                            {seg.type === "swim" ? "Pace (M:SS/100m)" :
                             seg.type === "bike" ? "Hastighed (km/t)" :
                             "Pace (M:SS/km)"}
                          </label>
                          <input
                            value={
                              seg.type === "swim" ? editSwimPace :
                              seg.type === "bike" ? editBikeKmh : editRunPace
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              if (seg.type === "swim") setEditSwimPace(v);
                              else if (seg.type === "bike") setEditBikeKmh(v);
                              else setEditRunPace(v);
                            }}
                            placeholder={seg.type === "swim" ? "1:50" : seg.type === "bike" ? "33.3" : "5:30"}
                            className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                      )}
                      {/* Distance (read-only info) */}
                      {seg.distance > 0 && (
                        <p className="text-[10px] text-muted-foreground">{(seg.distance / 1000).toFixed(1)} km</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}

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
                <select value={nutSegment} onChange={(e) => setNutSegment(e.target.value as SegmentType)} className="rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="bike">Cykel</option>
                  <option value="run">Loeb</option>
                  <option value="swim">Svoem</option>
                  <option value="t1">T1</option>
                  <option value="t2">T2</option>
                </select>
                <input placeholder="Min fra start" value={nutOffset} onChange={(e) => setNutOffset(e.target.value)} className="rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                <input placeholder="Produkt" value={nutItem} onChange={(e) => setNutItem(e.target.value)} className="rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                <input placeholder="Kalorier" value={nutCal} onChange={(e) => setNutCal(e.target.value)} className="rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                <input placeholder="Vaeske (ml)" value={nutFluid} onChange={(e) => setNutFluid(e.target.value)} className="rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
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
