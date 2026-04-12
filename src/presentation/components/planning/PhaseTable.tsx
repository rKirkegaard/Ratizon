import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import DatePicker from "@/presentation/components/shared/DatePicker";
import type { AthleteTrainingPhase } from "@/domain/types/planning.types";
import type { PhaseCTLTarget } from "@/application/hooks/planning/useCTLEstimate";

interface PhaseTableProps {
  phases: AthleteTrainingPhase[];
  isLoading: boolean;
  onCreatePhase: (phase: Partial<AthleteTrainingPhase>) => void;
  suggestedTargets?: PhaseCTLTarget[];
}

const PHASE_TYPE_LABELS: Record<string, string> = {
  base: "Grundtraening",
  build: "Opbygning",
  peak: "Top",
  race: "Konkurrence",
  recovery: "Restitution",
  transition: "Overgang",
};

const PHASE_TYPE_COLORS: Record<string, string> = {
  base: "bg-blue-500/20 text-blue-400",
  build: "bg-green-500/20 text-green-400",
  peak: "bg-yellow-500/20 text-yellow-400",
  race: "bg-red-500/20 text-red-400",
  recovery: "bg-purple-500/20 text-purple-400",
  transition: "bg-gray-500/20 text-gray-400",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
  });
}

function isCurrentPhase(phase: AthleteTrainingPhase): boolean {
  const now = new Date();
  const start = new Date(phase.startDate);
  const end = new Date(phase.endDate);
  return now >= start && now <= end;
}

export default function PhaseTable({
  phases,
  isLoading,
  onCreatePhase,
  suggestedTargets,
}: PhaseTableProps) {
  const suggestedMap = new Map(
    (suggestedTargets ?? []).map((t) => [t.phaseId, t.ctlTarget])
  );
  // Also build a map by phaseType for the create form placeholder
  const suggestedByType = new Map(
    (suggestedTargets ?? []).map((t) => [t.phaseType, t.ctlTarget])
  );
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    phaseName: "",
    phaseType: "base" as AthleteTrainingPhase["phaseType"],
    startDate: "",
    endDate: "",
    ctlTarget: "",
    weeklyHoursTarget: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onCreatePhase({
      phaseName: formData.phaseName,
      phaseType: formData.phaseType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      phaseNumber: phases.length + 1,
      ctlTarget: formData.ctlTarget ? Number(formData.ctlTarget) : null,
      weeklyHoursTarget: formData.weeklyHoursTarget
        ? Number(formData.weeklyHoursTarget)
        : null,
    });
    setFormData({
      phaseName: "",
      phaseType: "base",
      startDate: "",
      endDate: "",
      ctlTarget: "",
      weeklyHoursTarget: "",
    });
    setShowForm(false);
  }

  if (isLoading) {
    return (
      <div data-testid="phase-table" className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-lg border border-border/50 bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div data-testid="phase-table" className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Traeningsfaser</h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showForm ? "Annuller" : "+ Tilfoej fase"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 space-y-3 rounded-lg border border-border bg-muted/30 p-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              type="text"
              placeholder="Fasenavn"
              value={formData.phaseName}
              onChange={(e) =>
                setFormData({ ...formData, phaseName: e.target.value })
              }
              required
              className="rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <select
              value={formData.phaseType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  phaseType: e.target.value as AthleteTrainingPhase["phaseType"],
                })
              }
              className="rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {Object.entries(PHASE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <DatePicker
              value={formData.startDate}
              onChange={(v) => setFormData({ ...formData, startDate: v })}
              placeholder="Start"
              required
            />
            <DatePicker
              value={formData.endDate}
              onChange={(v) => setFormData({ ...formData, endDate: v })}
              placeholder="Slut"
              required
            />
            <input
              type="number"
              placeholder={suggestedByType.get(formData.phaseType) ? `Foreslaaet: ${suggestedByType.get(formData.phaseType)}` : "CTL-maal"}
              value={formData.ctlTarget}
              onChange={(e) =>
                setFormData({ ...formData, ctlTarget: e.target.value })
              }
              className="rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              type="number"
              step="0.5"
              placeholder="Ugentlige timer"
              value={formData.weeklyHoursTarget}
              onChange={(e) =>
                setFormData({ ...formData, weeklyHoursTarget: e.target.value })
              }
              className="rounded border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Opret fase
          </button>
        </form>
      )}

      {phases.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            Ingen traeningsfaser oprettet. Tilfoej faser for at strukturere din saeson.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Fase</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Start</th>
                <th className="pb-2 pr-4">Slut</th>
                <th className="pb-2 pr-4">CTL-maal</th>
                <th className="pb-2">Timer/uge</th>
              </tr>
            </thead>
            <tbody>
              {phases.map((phase) => {
                const current = isCurrentPhase(phase);
                return (
                  <tr
                    key={phase.id}
                    className={`border-b border-border/30 ${
                      current
                        ? "bg-primary/10 font-semibold"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <td className="py-2 pr-4 text-muted-foreground">
                      {phase.phaseNumber}
                    </td>
                    <td className="py-2 pr-4 text-foreground">
                      {phase.phaseName}
                      {current && (
                        <span className="ml-2 rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
                          Nu
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          PHASE_TYPE_COLORS[phase.phaseType] ?? ""
                        }`}
                      >
                        {PHASE_TYPE_LABELS[phase.phaseType] ?? phase.phaseType}
                      </span>
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-muted-foreground">
                      {formatDate(phase.startDate)}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-muted-foreground">
                      {formatDate(phase.endDate)}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-foreground">
                      <span className="inline-flex items-center gap-1">
                        {phase.ctlTarget ?? "–"}
                        {(() => {
                          const suggested = suggestedMap.get(phase.id);
                          if (!suggested || !phase.ctlTarget) return null;
                          const diff = Math.abs(phase.ctlTarget - suggested);
                          if (diff <= suggested * 0.1) {
                            return <Check size={12} className="text-emerald-400" />;
                          }
                          return (
                            <span title={`Anbefalet: ${suggested}`}>
                              <AlertTriangle size={12} className="text-amber-400" />
                            </span>
                          );
                        })()}
                      </span>
                    </td>
                    <td className="py-2 tabular-nums text-foreground">
                      {phase.weeklyHoursTarget
                        ? `${phase.weeklyHoursTarget}t`
                        : "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
