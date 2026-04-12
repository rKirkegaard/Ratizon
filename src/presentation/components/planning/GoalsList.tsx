import { useState, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import DatePicker from "@/presentation/components/shared/DatePicker";
import ConfirmDialog from "@/presentation/components/shared/ConfirmDialog";
import type { Goal } from "@/domain/types/planning.types";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import {
  getSubTypeOptions,
  getPresetDistances,
  TRIATHLON_SUB_LABELS,
  RUN_SUB_LABELS,
  BIKE_SUB_LABELS,
  SWIM_SUB_LABELS,
} from "@/domain/constants/racePresets";

interface GoalsListProps {
  goals: Goal[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onCreate: (goal: Partial<Goal>) => void;
  onUpdate: (goal: { id: string } & Partial<Goal>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Ingen dato";
  return new Date(dateStr).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}

function daysBetween(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function secsToHms(secs: number | null): string {
  if (secs == null || secs <= 0) return "";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function secsToMss(secs: number | null): string {
  if (secs == null || secs <= 0) return "";
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function hmsToSecs(str: string): number | null {
  const trimmed = str.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

function formatDistanceShort(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} km`;
  return `${m} m`;
}

/** Compute pace string from distance (m) and time (seconds) */
function paceFromDistAndTime(distM: number, timeSec: number, sport: string): string {
  if (!distM || !timeSec || timeSec <= 0) return "";
  if (sport === "bike") {
    // km/h
    const kmh = (distM / 1000) / (timeSec / 3600);
    return kmh.toFixed(1);
  }
  if (sport === "swim") {
    // M:SS per 100m
    const secPer100 = timeSec / (distM / 100);
    return secsToMss(Math.round(secPer100));
  }
  // run: M:SS per km
  const secPerKm = timeSec / (distM / 1000);
  return secsToMss(Math.round(secPerKm));
}

/** Compute expected time (seconds) from distance and pace */
function expectedTime(distM: number, paceStr: string, sport: string): number | null {
  if (!distM || !paceStr.trim()) return null;
  if (sport === "bike") {
    const kmh = parseFloat(paceStr);
    if (!kmh || kmh <= 0) return null;
    return (distM / 1000 / kmh) * 3600;
  }
  // swim: M:SS per 100m, run: M:SS per km
  const paceSec = hmsToSecs(paceStr);
  if (!paceSec) return null;
  if (sport === "swim") return (distM / 100) * paceSec;
  return (distM / 1000) * paceSec; // run
}

const PRIORITY_COLORS: Record<string, string> = {
  A: "bg-red-500/20 text-red-400",
  B: "bg-yellow-500/20 text-yellow-400",
  C: "bg-blue-500/20 text-blue-400",
};

const SPORT_LABELS: Record<string, string> = {
  triathlon: "Triatlon",
  run: "Loeb",
  bike: "Cykling",
  swim: "Svoem",
  ...TRIATHLON_SUB_LABELS,
  ...RUN_SUB_LABELS,
  ...BIKE_SUB_LABELS,
  ...SWIM_SUB_LABELS,
};

const RACE_SPORT_OPTIONS = [
  { value: "triathlon", label: "Triatlon" },
  { value: "run", label: "Loeb" },
  { value: "bike", label: "Cykling" },
  { value: "swim", label: "Svoem" },
];

const inputCls = "rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
const readOnlyCls = "rounded border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground cursor-default tabular-nums";

// ── Extracted sub-components (outside main component to avoid re-mount) ──

function DisciplineRow({ label, color, distM, distEditable, distLabel, paceValue, paceOnChange, pacePlaceholder, paceUnit, timeValue, timeOnChange, timePlaceholder, mismatch, onDistChange }: {
  label: string; color: string; distM: number; distEditable: boolean; distLabel: string;
  paceValue: string; paceOnChange: (v: string) => void; pacePlaceholder: string; paceUnit: string;
  timeValue: string; timeOnChange: (v: string) => void; timePlaceholder: string;
  mismatch: string | null; onDistChange?: (v: number) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr_1fr_1fr] gap-2 items-center">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-medium" style={{ color }}>{label}</span>
        </div>
        {distEditable ? (
          <input type="number" placeholder="Distance (m)" value={distM || ""} onChange={(e) => onDistChange?.(Number(e.target.value) || 0)} className={`${inputCls} tabular-nums`} />
        ) : (
          <span className={readOnlyCls}>{distLabel}</span>
        )}
        <div className="relative">
          <input type="text" placeholder={pacePlaceholder} value={paceValue} onChange={(e) => paceOnChange(e.target.value)} className={`${inputCls} tabular-nums pr-16`} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{paceUnit}</span>
        </div>
        <input type="text" placeholder={timePlaceholder} value={timeValue} onChange={(e) => timeOnChange(e.target.value)} className={`${inputCls} tabular-nums`} />
      </div>
      {mismatch && (
        <div className="sm:col-span-4 flex items-center gap-1.5 px-1 -mt-1 mb-1">
          <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
          <span className="text-[11px] text-amber-400">{mismatch}</span>
        </div>
      )}
    </>
  );
}

function TransitionRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr_1fr_1fr] gap-2 items-center">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="hidden sm:block" />
      <span className="hidden sm:block" />
      <input type="text" placeholder="M:SS" value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} tabular-nums`} />
    </div>
  );
}

// ── Form state ───────────────────────────────────────────────────────

interface FormData {
  title: string;
  goalType: Goal["goalType"];
  sport: string;
  raceSubType: string;
  targetDate: string;
  racePriority: string;
  raceDistance: string;
  raceTargetTime: string;
  swimTargetTime: string;
  bikeTargetTime: string;
  runTargetTime: string;
  t1TargetTime: string;
  t2TargetTime: string;
  // Pace helpers (not stored)
  swimPace: string;  // M:SS per 100m
  bikePace: string;  // km/h
  runPace: string;   // M:SS per km
  // Leg distances (derived from preset, editable for custom)
  swimDist: number;
  bikeDist: number;
  runDist: number;
  notes: string;
}

const emptyForm: FormData = {
  title: "", goalType: "race", sport: "", raceSubType: "", targetDate: "",
  racePriority: "", raceDistance: "", raceTargetTime: "",
  swimTargetTime: "", bikeTargetTime: "", runTargetTime: "",
  t1TargetTime: "", t2TargetTime: "",
  swimPace: "", bikePace: "", runPace: "",
  swimDist: 0, bikeDist: 0, runDist: 0,
  notes: "",
};

// ── Component ────────────────────────────────────────────────────────

export default function GoalsList({ goals, isLoading, onDelete, onCreate, onUpdate }: GoalsListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [deleteGoal, setDeleteGoal] = useState<{ id: string; title: string } | null>(null);

  function resetForm() { setFormData(emptyForm); setEditingId(null); setShowForm(false); }

  function startEdit(goal: Goal) {
    // Infer sub-type from distance if not set
    let subType = goal.raceSubType ?? "";
    if (!subType && goal.sport === "triathlon" && goal.raceDistance) {
      if (goal.raceDistance >= 220000) subType = "ironman";
      else if (goal.raceDistance >= 100000) subType = "70.3";
      else if (goal.raceDistance >= 50000) subType = "quarter";
      else if (goal.raceDistance >= 45000) subType = "olympic";
      else subType = "sprint";
    }
    const dists = subType && goal.sport
      ? getPresetDistances(goal.sport, subType)
      : {};

    // Compute pace from distance + time if available
    const swimDist = dists.swimM ?? 0;
    const bikeDist = dists.bikeM ?? 0;
    const runDist = dists.runM ?? 0;
    const swimPace = swimDist && goal.swimTargetTime ? paceFromDistAndTime(swimDist, goal.swimTargetTime, "swim") : "";
    const bikePace = bikeDist && goal.bikeTargetTime ? paceFromDistAndTime(bikeDist, goal.bikeTargetTime, "bike") : "";
    const runPace = runDist && goal.runTargetTime ? paceFromDistAndTime(runDist, goal.runTargetTime, "run") : "";

    setFormData({
      title: goal.title,
      goalType: goal.goalType,
      sport: goal.sport ?? "",
      raceSubType: subType,
      targetDate: goal.targetDate ? goal.targetDate.split("T")[0] : "",
      racePriority: goal.racePriority ?? "",
      raceDistance: goal.raceDistance != null ? String(goal.raceDistance) : "",
      raceTargetTime: secsToHms(goal.raceTargetTime),
      swimTargetTime: secsToHms(goal.swimTargetTime),
      bikeTargetTime: secsToHms(goal.bikeTargetTime),
      runTargetTime: secsToHms(goal.runTargetTime),
      t1TargetTime: secsToHms(goal.t1TargetTime),
      t2TargetTime: secsToHms(goal.t2TargetTime),
      swimPace, bikePace, runPace,
      swimDist, bikeDist, runDist,
      notes: goal.notes ?? "",
    });
    setEditingId(goal.id);
    setShowForm(true);
  }

  function handleSportChange(sport: string) {
    setFormData((prev) => ({ ...prev, sport, raceSubType: "", swimDist: 0, bikeDist: 0, runDist: 0 }));
  }

  function handleSubTypeChange(subType: string) {
    const dists = getPresetDistances(formData.sport, subType);
    setFormData((prev) => ({
      ...prev,
      raceSubType: subType,
      swimDist: dists.swimM ?? 0,
      bikeDist: dists.bikeM ?? 0,
      runDist: dists.runM ?? 0,
      raceDistance: dists.totalM ? String(dists.totalM) : prev.raceDistance,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: formData.title,
      goalType: formData.goalType,
      sport: formData.sport || null,
      raceSubType: formData.raceSubType || null,
      targetDate: formData.targetDate || null,
      racePriority: (formData.racePriority || null) as Goal["racePriority"],
      raceDistance: formData.raceDistance ? Number(formData.raceDistance) : null,
      raceTargetTime: computedTotal ?? hmsToSecs(formData.raceTargetTime),
      swimTargetTime: hmsToSecs(formData.swimTargetTime),
      bikeTargetTime: hmsToSecs(formData.bikeTargetTime),
      runTargetTime: hmsToSecs(formData.runTargetTime),
      t1TargetTime: hmsToSecs(formData.t1TargetTime),
      t2TargetTime: hmsToSecs(formData.t2TargetTime),
      notes: formData.notes || null,
    };
    if (editingId) { onUpdate({ id: editingId, ...payload }); }
    else { onCreate(payload); }
    resetForm();
  }

  const isRace = formData.goalType === "race";
  const sport = formData.sport;
  const isCustom = formData.raceSubType === "custom";
  const hasDiscipline = (d: string) => sport === "triathlon" || sport === d;
  const subTypeOptions = useMemo(() => getSubTypeOptions(sport), [sport]);

  // Auto-calculate total from splits
  const splitSum = useMemo(() => {
    const parts = [
      hmsToSecs(formData.swimTargetTime),
      hmsToSecs(formData.t1TargetTime),
      hmsToSecs(formData.bikeTargetTime),
      hmsToSecs(formData.t2TargetTime),
      hmsToSecs(formData.runTargetTime),
    ].filter((v): v is number => v !== null && v > 0);
    return parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : null;
  }, [formData.swimTargetTime, formData.t1TargetTime, formData.bikeTargetTime, formData.t2TargetTime, formData.runTargetTime]);

  const hasSplits = splitSum !== null;
  const computedTotal = hasSplits ? splitSum : null;

  // Cross-validation per discipline
  function checkMismatch(distM: number, pace: string, timeSec: number | null, disciplineSport: string): string | null {
    if (!distM || !pace.trim() || !timeSec) return null;
    const exp = expectedTime(distM, pace, disciplineSport);
    if (!exp) return null;
    const diff = Math.abs(exp - timeSec);
    const pct = (diff / timeSec) * 100;
    if (pct > 2) return `Pace x distance = ${secsToHms(Math.round(exp))} (afviger ${Math.round(pct)}%)`;
    return null;
  }

  if (isLoading) {
    return (
      <div data-testid="goals-list" className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg border border-border/50 bg-muted" />
        ))}
      </div>
    );
  }

  const activeGoals = goals.filter((g) => g.status === "active");
  const futureGoals = activeGoals.filter((g) => g.targetDate && daysBetween(g.targetDate) >= 0);

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div data-testid="goals-list" className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Delmaal & Events</h3>
        <button type="button" onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          {showForm ? "Annuller" : "+ Tilfoej maal"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          {/* Goal ID (edit mode only) */}
          {editingId && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>ID:</span>
              <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">{editingId}</code>
            </div>
          )}
          {/* Section A: Identity */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="text" placeholder="Titel (fx Ironman Copenhagen 2026)" value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className={inputCls} />
            <select value={formData.goalType} onChange={(e) => setFormData({ ...formData, goalType: e.target.value as Goal["goalType"] })} className={inputCls}>
              <option value="race">Race / Konkurrence</option>
              <option value="performance">Praestationsmaal</option>
              <option value="volume">Volumenmaal</option>
              <option value="health">Sundhedsmaal</option>
            </select>
          </div>

          {/* Section B: Race Config */}
          {isRace && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <select value={formData.sport} onChange={(e) => handleSportChange(e.target.value)} className={inputCls}>
                <option value="">Vaelg sportsgren...</option>
                {RACE_SPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {sport && (
                <select value={formData.raceSubType} onChange={(e) => handleSubTypeChange(e.target.value)} className={inputCls}>
                  <option value="">Vaelg distance...</option>
                  {subTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
              <select value={formData.racePriority} onChange={(e) => setFormData({ ...formData, racePriority: e.target.value })} className={inputCls}>
                <option value="">Prioritet</option>
                <option value="A">A-race</option>
                <option value="B">B-race</option>
                <option value="C">C-race</option>
              </select>
              <DatePicker value={formData.targetDate} onChange={(v) => setFormData({ ...formData, targetDate: v })} />
            </div>
          )}

          {/* Non-race basic fields */}
          {!isRace && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input type="text" placeholder="Sport" value={formData.sport} onChange={(e) => setFormData({ ...formData, sport: e.target.value })} className={inputCls} />
              <DatePicker value={formData.targetDate} onChange={(v) => setFormData({ ...formData, targetDate: v })} />
            </div>
          )}

          {/* Section C: Discipline Splits */}
          {isRace && sport && formData.raceSubType && (
            <div className="space-y-1.5">
              {/* Column headers */}
              <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_1fr] gap-2 px-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                <span />
                <span>Distance</span>
                <span>Pace / Hastighed</span>
                <span>Tid</span>
              </div>

              {hasDiscipline("swim") && (
                <DisciplineRow label="Svoem" color="#22d3ee"
                  distM={formData.swimDist} distEditable={isCustom}
                  distLabel={formData.swimDist > 0 ? formatDistanceShort(formData.swimDist) : "–"}
                  paceValue={formData.swimPace}
                  paceOnChange={(v) => {
                    const timeSec = expectedTime(formData.swimDist, v, "swim");
                    setFormData((prev) => ({ ...prev, swimPace: v, ...(timeSec ? { swimTargetTime: secsToHms(Math.round(timeSec)) } : {}) }));
                  }}
                  pacePlaceholder="1:45" paceUnit="/100m"
                  timeValue={formData.swimTargetTime}
                  timeOnChange={(v) => {
                    const sec = hmsToSecs(v);
                    const pace = sec && formData.swimDist ? paceFromDistAndTime(formData.swimDist, sec, "swim") : "";
                    setFormData((prev) => ({ ...prev, swimTargetTime: v, ...(pace ? { swimPace: pace } : {}) }));
                  }}
                  timePlaceholder="H:MM:SS"
                  mismatch={null}
                  onDistChange={(v) => setFormData((prev) => ({ ...prev, swimDist: v }))} />
              )}

              {sport === "triathlon" && (
                <TransitionRow label="T1" value={formData.t1TargetTime}
                  onChange={(v) => setFormData((prev) => ({ ...prev, t1TargetTime: v }))} />
              )}

              {hasDiscipline("bike") && (
                <DisciplineRow label="Cykel" color="#22c55e"
                  distM={formData.bikeDist} distEditable={isCustom}
                  distLabel={formData.bikeDist > 0 ? formatDistanceShort(formData.bikeDist) : "–"}
                  paceValue={formData.bikePace}
                  paceOnChange={(v) => {
                    const timeSec = expectedTime(formData.bikeDist, v, "bike");
                    setFormData((prev) => ({ ...prev, bikePace: v, ...(timeSec ? { bikeTargetTime: secsToHms(Math.round(timeSec)) } : {}) }));
                  }}
                  pacePlaceholder="32.0" paceUnit="km/t"
                  timeValue={formData.bikeTargetTime}
                  timeOnChange={(v) => {
                    const sec = hmsToSecs(v);
                    const pace = sec && formData.bikeDist ? paceFromDistAndTime(formData.bikeDist, sec, "bike") : "";
                    setFormData((prev) => ({ ...prev, bikeTargetTime: v, ...(pace ? { bikePace: pace } : {}) }));
                  }}
                  timePlaceholder="H:MM:SS"
                  mismatch={null}
                  onDistChange={(v) => setFormData((prev) => ({ ...prev, bikeDist: v }))} />
              )}

              {sport === "triathlon" && (
                <TransitionRow label="T2" value={formData.t2TargetTime}
                  onChange={(v) => setFormData((prev) => ({ ...prev, t2TargetTime: v }))} />
              )}

              {hasDiscipline("run") && (
                <DisciplineRow label="Loeb" color="#f97316"
                  distM={formData.runDist} distEditable={isCustom}
                  distLabel={formData.runDist > 0 ? formatDistanceShort(formData.runDist) : "–"}
                  paceValue={formData.runPace}
                  paceOnChange={(v) => {
                    const timeSec = expectedTime(formData.runDist, v, "run");
                    setFormData((prev) => ({ ...prev, runPace: v, ...(timeSec ? { runTargetTime: secsToHms(Math.round(timeSec)) } : {}) }));
                  }}
                  pacePlaceholder="5:15" paceUnit="/km"
                  timeValue={formData.runTargetTime}
                  timeOnChange={(v) => {
                    const sec = hmsToSecs(v);
                    const pace = sec && formData.runDist ? paceFromDistAndTime(formData.runDist, sec, "run") : "";
                    setFormData((prev) => ({ ...prev, runTargetTime: v, ...(pace ? { runPace: pace } : {}) }));
                  }}
                  timePlaceholder="H:MM:SS"
                  mismatch={null}
                  onDistChange={(v) => setFormData((prev) => ({ ...prev, runDist: v }))} />
              )}

              {/* Section D: Totals */}
              <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr_1fr_1fr] gap-2 items-center mt-2 pt-2 border-t border-border/50">
                <span className="text-xs font-semibold text-foreground">Total</span>
                <span className="text-xs tabular-nums text-muted-foreground hidden sm:block">
                  {formData.raceDistance ? formatDistanceShort(Number(formData.raceDistance)) : "–"}
                </span>
                <span className="hidden sm:block" />
                {hasSplits ? (
                  <span className={`${readOnlyCls} font-semibold bg-primary/10 text-primary border-primary/30`}>
                    {secsToHms(computedTotal)} <span className="text-[10px] font-normal text-muted-foreground ml-1">beregnet</span>
                  </span>
                ) : (
                  <input type="text" placeholder="HH:MM:SS" value={formData.raceTargetTime}
                    onChange={(e) => setFormData({ ...formData, raceTargetTime: e.target.value })}
                    className={`${inputCls} tabular-nums`} />
                )}
              </div>
            </div>
          )}

          {/* Section E: Notes + Submit */}
          <input type="text" placeholder="Noter" value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className={`${inputCls} w-full`} />
          <button type="submit" className="rounded bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            {editingId ? "Gem aendringer" : "Opret maal"}
          </button>
        </form>
      )}

      {/* Goal list */}
      {futureGoals.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">Ingen kommende maal. Tilfoej et maal for at komme i gang.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {futureGoals.map((goal) => (
            <div key={goal.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
              <div className="flex items-center gap-3">
                {goal.sport && <SportIcon sport={goal.sport} size={16} />}
                <div>
                  <p className="text-sm font-medium text-foreground">{goal.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(goal.targetDate)} &middot;{" "}
                    {SPORT_LABELS[goal.raceSubType ?? ""] ?? SPORT_LABELS[goal.sport ?? ""] ?? goal.goalType}
                    {goal.raceTargetTime != null && goal.raceTargetTime > 0 && (
                      <span> &middot; Maal: {secsToHms(goal.raceTargetTime)}</span>
                    )}
                    {goal.swimTargetTime && goal.bikeTargetTime && goal.runTargetTime && (
                      <span className="text-muted-foreground/70">
                        {" "}({secsToHms(goal.swimTargetTime)} / {secsToHms(goal.bikeTargetTime)} / {secsToHms(goal.runTargetTime)})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {goal.racePriority && (
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${PRIORITY_COLORS[goal.racePriority] ?? ""}`}>
                    {goal.racePriority}
                  </span>
                )}
                {goal.targetDate && (
                  <span className="text-xs tabular-nums text-muted-foreground">{daysBetween(goal.targetDate)}d</span>
                )}
                <button type="button" onClick={() => startEdit(goal)} className="rounded p-1 text-muted-foreground hover:bg-primary/20 hover:text-primary" title="Rediger">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
                  </svg>
                </button>
                <button type="button" onClick={() => setDeleteGoal({ id: goal.id, title: goal.title })} className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive" title="Slet">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteGoal}
        onClose={() => setDeleteGoal(null)}
        onConfirm={() => { if (deleteGoal) { onDelete(deleteGoal.id); setDeleteGoal(null); } }}
        title="Slet maal"
        message={`Er du sikker paa, at du vil slette "${deleteGoal?.title}"? Denne handling kan ikke fortrydes.`}
      />
    </div>
  );
}
