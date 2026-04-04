import type { Sport } from "../types/athlete.types";

const sportColorVars: Record<Sport, string> = {
  swim: "var(--sport-swim)",
  bike: "var(--sport-bike)",
  run: "var(--sport-run)",
};

const sportLabels: Record<Sport, string> = {
  swim: "Svomning",
  bike: "Cykling",
  run: "Lob",
};

const sportIconNames: Record<Sport, "Waves" | "Bike" | "Footprints"> = {
  swim: "Waves",
  bike: "Bike",
  run: "Footprints",
};

/**
 * Returnerer CSS variabel for sportfarve
 */
export function getSportColor(sport: Sport): string {
  return sportColorVars[sport];
}

/**
 * Returnerer dansk label for sport
 */
export function getSportLabel(sport: Sport): string {
  return sportLabels[sport];
}

/**
 * Returnerer Lucide ikon-navn for sport
 */
export function getSportIconName(sport: Sport): "Waves" | "Bike" | "Footprints" {
  return sportIconNames[sport];
}

/**
 * Returnerer alle sportfarver som objekt
 */
export function getAllSportColors(): Record<Sport, string> {
  return { ...sportColorVars };
}
