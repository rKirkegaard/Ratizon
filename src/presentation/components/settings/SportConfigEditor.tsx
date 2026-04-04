import { useState } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import {
  useSportConfigs,
  useApplySportPreset,
} from "@/application/hooks/athlete/useSportConfigs";
import type { SportConfig, SportPreset } from "@/domain/types/sport.types";
import { SportIcon } from "@/presentation/components/shared/SportIcon";

interface SportConfigEditorProps {
  athleteId: string;
}

const PRESET_OPTIONS: { key: SportPreset; label: string; desc: string }[] = [
  { key: "triathlon", label: "Triathlon", desc: "Svoem + Cykel + Loeb + Styrke" },
  { key: "runner", label: "Loeber", desc: "Loeb + Styrke" },
  { key: "cyclist", label: "Cyklist", desc: "Cykel + Styrke" },
];

const ZONE_MODEL_LABELS: Record<string, string> = {
  hr: "Pulszoner",
  power: "Effektzoner",
  pace: "Tempozoner",
};

const PRESET_COLORS = [
  "#3B82F6",
  "#4EC65E",
  "#F97429",
  "#A855F7",
  "#EC4899",
  "#14B8A6",
  "#F59E0B",
  "#EF4444",
  "#6366F1",
  "#06B6D4",
];

export default function SportConfigEditor({ athleteId }: SportConfigEditorProps) {
  const { sportConfigs, loading, refetch } = useSportConfigs(athleteId);
  const { applyPreset, loading: presetLoading } = useApplySportPreset(athleteId);
  const getActiveSports = useAthleteStore((s) => s.getActiveSports);

  const [editingSport, setEditingSport] = useState<string | null>(null);

  async function handlePreset(preset: SportPreset) {
    await applyPreset(preset);
    await refetch();
  }

  if (loading) {
    return (
      <div data-testid="sport-config-editor" className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg border border-border/50 bg-muted"
          />
        ))}
      </div>
    );
  }

  const activeSports = getActiveSports();

  return (
    <div data-testid="sport-config-editor" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        Sportsdiscipliner
      </h3>

      {/* Preset buttons */}
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESET_OPTIONS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => handlePreset(p.key)}
            disabled={presetLoading}
            className="rounded border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
            title={p.desc}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Sport list */}
      {activeSports.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            Ingen sportsdiscipliner konfigureret. Vaelg et preset ovenfor.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeSports.map((sport) => (
            <div key={sport.sport_key}>
              <div
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                  editingSport === sport.sport_key
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:bg-muted/30"
                }`}
                onClick={() =>
                  setEditingSport(
                    editingSport === sport.sport_key ? null : sport.sport_key
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <SportIcon sport={sport.sport_key} size={18} />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {sport.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sport.sport_key}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full border border-border"
                    style={{ backgroundColor: sport.color }}
                  />
                  <div className="flex gap-1">
                    {sport.has_distance && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        Afstand
                      </span>
                    )}
                    {sport.has_power && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        Effekt
                      </span>
                    )}
                    {sport.has_pace && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        Tempo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {editingSport === sport.sport_key && (
                <div className="mt-1 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Farve
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {PRESET_COLORS.map((c) => (
                          <div
                            key={c}
                            className={`h-6 w-6 cursor-pointer rounded-full border-2 ${
                              sport.color === c
                                ? "border-white ring-1 ring-primary"
                                : "border-transparent"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Zone-model
                      </label>
                      <p className="text-sm text-foreground">
                        {sport.zone_model
                          ? ZONE_MODEL_LABELS[sport.zone_model] ?? sport.zone_model
                          : "Ingen"}
                      </p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Afstandsenhed
                      </label>
                      <p className="text-sm text-foreground">
                        {sport.distance_unit ?? "–"}
                      </p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Tempoenhed
                      </label>
                      <p className="text-sm text-foreground">
                        {sport.pace_unit ?? "–"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3">
                    <ToggleBadge label="Afstand" active={sport.has_distance} />
                    <ToggleBadge label="Effekt" active={sport.has_power} />
                    <ToggleBadge label="Tempo" active={sport.has_pace} />
                    <ToggleBadge label="Zoner" active={sport.has_zones} />
                    <ToggleBadge label="Dedikeret side" active={sport.dedicated_page} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? "bg-green-500/20 text-green-400"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {label}: {active ? "Ja" : "Nej"}
    </span>
  );
}
