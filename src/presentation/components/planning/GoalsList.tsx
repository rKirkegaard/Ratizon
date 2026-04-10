import { useState } from "react";
import type { Goal } from "@/domain/types/planning.types";
import { SportIcon } from "@/presentation/components/shared/SportIcon";

interface GoalsListProps {
  goals: Goal[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onCreate: (goal: Partial<Goal>) => void;
  onUpdate: (goal: { id: string } & Partial<Goal>) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Ingen dato";
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysBetween(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const GOAL_TYPE_LABELS: Record<string, string> = {
  race: "Loeb",
  performance: "Praestationsmaal",
  volume: "Volumenmaal",
  health: "Sundhedsmaal",
};

const PRIORITY_COLORS: Record<string, string> = {
  A: "bg-red-500/20 text-red-400",
  B: "bg-yellow-500/20 text-yellow-400",
  C: "bg-blue-500/20 text-blue-400",
};

export default function GoalsList({
  goals,
  isLoading,
  onDelete,
  onCreate,
  onUpdate,
}: GoalsListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const emptyForm = {
    title: "",
    goalType: "race" as Goal["goalType"],
    sport: "",
    targetDate: "",
    racePriority: "" as string,
    raceDistance: "",
    swimTargetTime: "",
    bikeTargetTime: "",
    runTargetTime: "",
    t1TargetTime: "",
    t2TargetTime: "",
    notes: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  /** Convert seconds → HH:MM:SS string for display */
  function secsToHms(secs: number | null): string {
    if (secs == null || secs <= 0) return "";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  /** Convert HH:MM:SS or MM:SS string → seconds */
  function hmsToSecs(str: string): number | null {
    const trimmed = str.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(":").map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  }

  function resetForm() {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(goal: Goal) {
    setFormData({
      title: goal.title,
      goalType: goal.goalType,
      sport: goal.sport ?? "",
      targetDate: goal.targetDate ? goal.targetDate.split("T")[0] : "",
      racePriority: goal.racePriority ?? "",
      raceDistance: goal.raceDistance != null ? String(goal.raceDistance) : "",
      swimTargetTime: secsToHms(goal.swimTargetTime),
      bikeTargetTime: secsToHms(goal.bikeTargetTime),
      runTargetTime: secsToHms(goal.runTargetTime),
      t1TargetTime: secsToHms(goal.t1TargetTime),
      t2TargetTime: secsToHms(goal.t2TargetTime),
      notes: goal.notes ?? "",
    });
    setEditingId(goal.id);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: formData.title,
      goalType: formData.goalType,
      sport: formData.sport || null,
      targetDate: formData.targetDate || null,
      racePriority: (formData.racePriority || null) as Goal["racePriority"],
      raceDistance: formData.raceDistance ? Number(formData.raceDistance) : null,
      swimTargetTime: hmsToSecs(formData.swimTargetTime),
      bikeTargetTime: hmsToSecs(formData.bikeTargetTime),
      runTargetTime: hmsToSecs(formData.runTargetTime),
      t1TargetTime: hmsToSecs(formData.t1TargetTime),
      t2TargetTime: hmsToSecs(formData.t2TargetTime),
      notes: formData.notes || null,
    };
    if (editingId) {
      onUpdate({ id: editingId, ...payload });
    } else {
      onCreate(payload);
    }
    resetForm();
  }

  if (isLoading) {
    return (
      <div data-testid="goals-list" className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg border border-border/50 bg-muted"
          />
        ))}
      </div>
    );
  }

  const activeGoals = goals.filter((g) => g.status === "active");
  const futureGoals = activeGoals.filter(
    (g) => g.targetDate && daysBetween(g.targetDate) >= 0
  );

  return (
    <div data-testid="goals-list" className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Delmaal & Events</h3>
        <button
          type="button"
          onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showForm ? "Annuller" : "+ Tilfoej maal"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 space-y-3 rounded-lg border border-border bg-muted/30 p-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Titel"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <select
              value={formData.goalType}
              onChange={(e) =>
                setFormData({ ...formData, goalType: e.target.value as Goal["goalType"] })
              }
              className="rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="race">Loeb</option>
              <option value="performance">Praestationsmaal</option>
              <option value="volume">Volumenmaal</option>
              <option value="health">Sundhedsmaal</option>
            </select>
            <input
              type="text"
              placeholder="Sport (f.eks. run, bike)"
              value={formData.sport}
              onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
              className="rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              className="rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <select
              value={formData.racePriority}
              onChange={(e) =>
                setFormData({ ...formData, racePriority: e.target.value })
              }
              className="rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Ingen prioritet</option>
              <option value="A">A-loeb</option>
              <option value="B">B-loeb</option>
              <option value="C">C-loeb</option>
            </select>
            <input
              type="text"
              placeholder="Noter"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              type="number"
              placeholder="Distance (meter)"
              value={formData.raceDistance}
              onChange={(e) => setFormData({ ...formData, raceDistance: e.target.value })}
              className="rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Discipline target times */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Maaltider pr. disciplin (HH:MM:SS)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Svoemning</label>
                <input
                  type="text"
                  placeholder="00:30:00"
                  value={formData.swimTargetTime}
                  onChange={(e) => setFormData({ ...formData, swimTargetTime: e.target.value })}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">T1</label>
                <input
                  type="text"
                  placeholder="00:02:00"
                  value={formData.t1TargetTime}
                  onChange={(e) => setFormData({ ...formData, t1TargetTime: e.target.value })}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Cykel</label>
                <input
                  type="text"
                  placeholder="02:30:00"
                  value={formData.bikeTargetTime}
                  onChange={(e) => setFormData({ ...formData, bikeTargetTime: e.target.value })}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">T2</label>
                <input
                  type="text"
                  placeholder="00:02:00"
                  value={formData.t2TargetTime}
                  onChange={(e) => setFormData({ ...formData, t2TargetTime: e.target.value })}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Loeb</label>
                <input
                  type="text"
                  placeholder="01:45:00"
                  value={formData.runTargetTime}
                  onChange={(e) => setFormData({ ...formData, runTargetTime: e.target.value })}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="rounded bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {editingId ? "Gem aendringer" : "Opret maal"}
          </button>
        </form>
      )}

      {futureGoals.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            Ingen kommende maal. Tilfoej et maal for at komme i gang.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {futureGoals.map((goal) => (
            <div
              key={goal.id}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                {goal.sport && <SportIcon sport={goal.sport} size={16} />}
                <div>
                  <p className="text-sm font-medium text-foreground">{goal.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(goal.targetDate)} &middot;{" "}
                    {GOAL_TYPE_LABELS[goal.goalType] ?? goal.goalType}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {goal.racePriority && (
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      PRIORITY_COLORS[goal.racePriority] ?? ""
                    }`}
                  >
                    {goal.racePriority}
                  </span>
                )}
                {goal.targetDate && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {daysBetween(goal.targetDate)}d
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(goal)}
                  className="rounded p-1 text-muted-foreground hover:bg-primary/20 hover:text-primary"
                  title="Rediger maal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(goal.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                  title="Slet maal"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
