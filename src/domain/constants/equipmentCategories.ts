export type EquipmentCategory =
  | "bike" | "run_shoes" | "wetsuit" | "swim_gear"
  | "helmet" | "pedals" | "wheels" | "other";

export const CATEGORY_ICONS: Record<string, string> = {
  run_shoes: "👟",
  bike: "🚴",
  wetsuit: "🏊",
  swim_gear: "🥽",
  helmet: "⛑️",
  pedals: "🔧",
  wheels: "🛞",
  other: "🎽",
};

export const SPORT_CATEGORIES: Record<string, string[]> = {
  run: ["run_shoes"],
  bike: ["bike", "helmet", "pedals", "wheels"],
  swim: ["wetsuit", "swim_gear"],
};

export const DEFAULT_RETIREMENT: Record<string, { km?: number; hours?: number }> = {
  run_shoes: { km: 700 },
  bike: { km: 30000 },
  wheels: { km: 20000 },
  pedals: { km: 15000 },
  wetsuit: { hours: 200 },
  helmet: {},
  swim_gear: {},
  other: {},
};

export const CATEGORY_LABELS: Record<string, string> = {
  run_shoes: "Loebesko",
  bike: "Cykel",
  wetsuit: "Vaadragt",
  swim_gear: "Svoemmeudstyr",
  helmet: "Hjelm",
  pedals: "Pedaler",
  wheels: "Hjulsaet",
  other: "Andet",
};

export const SPORT_LABELS: Record<string, string> = {
  run: "Loeb",
  bike: "Cykel",
  swim: "Svoemning",
};

export function getCategoryInfo(category: string) {
  return {
    icon: CATEGORY_ICONS[category] ?? CATEGORY_ICONS.other,
    label: CATEGORY_LABELS[category] ?? category,
    sport: Object.entries(SPORT_CATEGORIES).find(([, cats]) => cats.includes(category))?.[0] ?? null,
  };
}

export function getLifespanStatus(pct: number | null): "good" | "warning" | "critical" | "exceeded" | null {
  if (pct === null) return null;
  if (pct >= 100) return "exceeded";
  if (pct >= 90) return "critical";
  if (pct >= 75) return "warning";
  return "good";
}
