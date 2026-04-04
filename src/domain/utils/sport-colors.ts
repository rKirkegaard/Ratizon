import type { SportConfig } from "../types/sport.types";

/**
 * Fallback CSS variable-baserede sportfarver.
 * Faktiske farver kommer fra sport_configs per atlet via athleteStore.
 */
const DEFAULT_COLOR_VARS: Record<string, string> = {
  swim: "var(--sport-swim)",
  bike: "var(--sport-bike)",
  run: "var(--sport-run)",
  strength: "var(--sport-strength)",
};

const DEFAULT_LABELS: Record<string, string> = {
  swim: "Svomning",
  bike: "Cykling",
  run: "Lob",
  strength: "Styrke",
};

const DEFAULT_ICON_NAMES: Record<string, string> = {
  swim: "waves",
  bike: "bike",
  run: "footprints",
  strength: "dumbbell",
};

/**
 * Returnerer farve for sport — foretruekker sportConfig, falder tilbage til CSS variabel
 */
export function getSportColor(sport: string, configs?: SportConfig[]): string {
  if (configs) {
    const config = configs.find((c) => c.sport_key === sport && c.is_active);
    if (config) return config.color;
  }
  return DEFAULT_COLOR_VARS[sport] ?? "var(--sport-other)";
}

/**
 * Returnerer dansk label for sport — foretruekker sportConfig
 */
export function getSportLabel(sport: string, configs?: SportConfig[]): string {
  if (configs) {
    const config = configs.find((c) => c.sport_key === sport && c.is_active);
    if (config) return config.display_name;
  }
  return DEFAULT_LABELS[sport] ?? sport;
}

/**
 * Returnerer Lucide ikon-navn for sport — foretruekker sportConfig
 */
export function getSportIconName(sport: string, configs?: SportConfig[]): string {
  if (configs) {
    const config = configs.find((c) => c.sport_key === sport && c.is_active);
    if (config) return config.icon;
  }
  return DEFAULT_ICON_NAMES[sport] ?? "activity";
}

/**
 * Returnerer alle aktive sportfarver som objekt
 */
export function getAllSportColors(configs?: SportConfig[]): Record<string, string> {
  if (configs && configs.length > 0) {
    const result: Record<string, string> = {};
    for (const c of configs) {
      if (c.is_active) {
        result[c.sport_key] = c.color;
      }
    }
    return result;
  }
  return { ...DEFAULT_COLOR_VARS };
}
