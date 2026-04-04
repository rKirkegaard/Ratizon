import { useState } from "react";
import type { Goal } from "@/domain/types/planning.types";
import { SportIcon } from "@/presentation/components/shared/SportIcon";

interface GoalsListProps {
  goals: Goal[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onCreate: (goal: Partial<Goal>) => void;
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
}: GoalsListProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    goalType: "race" as Goal["goalType"],
    sport: "",
    targetDate: "",
    racePriority: "" as string,
    notes: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onCreate({
      title: formData.title,
      goalType: formData.goalType,
      sport: formData.sport || null,
      targetDate: formData.targetDate || null,
      racePriority: (formData.racePriority || null) as Goal["racePriority"],
      notes: formData.notes || null,
    });
    setFormData({
      title: "",
      goalType: "race",
      sport: "",
      targetDate: "",
      racePriority: "",
      notes: "",
    });
    setShowForm(false);
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
          onClick={() => setShowForm(!showForm)}
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
          </div>
          <button
            type="submit"
            className="rounded bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Opret maal
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
