/** Standard triathlon distances in meters */
export const TRIATHLON_PRESETS: Record<string, { swim: number; bike: number; run: number }> = {
  sprint:  { swim: 750,  bike: 20000,  run: 5000   },
  olympic: { swim: 1500, bike: 40000,  run: 10000  },
  quarter: { swim: 950,  bike: 45000,  run: 10000  },
  "70.3":  { swim: 1900, bike: 90000,  run: 21097  },
  ironman: { swim: 3800, bike: 180200, run: 42195  },
};

/** Standard running distances in meters */
export const RUN_PRESETS: Record<string, number> = {
  "5k": 5000,
  "10k": 10000,
  half_marathon: 21097,
  marathon: 42195,
};

/** Standard cycling distances in meters */
export const BIKE_PRESETS: Record<string, number> = {
  "20k_tt": 20000,
  "40k_tt": 40000,
  "100k": 100000,
  "180k": 180000,
};

/** Standard swimming distances in meters */
export const SWIM_PRESETS: Record<string, number> = {
  "750m": 750,
  "1500m": 1500,
  "1900m": 1900,
  "3800m": 3800,
};

/** UI labels for sub-types */
export const TRIATHLON_SUB_LABELS: Record<string, string> = {
  sprint: "Sprint",
  olympic: "Olympisk",
  quarter: "1/4 Ironman",
  "70.3": "70.3 / Half Ironman",
  ironman: "Ironman (Full)",
  custom: "Custom",
};

export const RUN_SUB_LABELS: Record<string, string> = {
  "5k": "5 km",
  "10k": "10 km",
  half_marathon: "Halvmaraton",
  marathon: "Maraton",
  custom: "Custom",
};

export const BIKE_SUB_LABELS: Record<string, string> = {
  "20k_tt": "20 km TT",
  "40k_tt": "40 km TT",
  "100k": "100 km",
  "180k": "180 km",
  custom: "Custom",
};

export const SWIM_SUB_LABELS: Record<string, string> = {
  "750m": "750 m",
  "1500m": "1500 m",
  "1900m": "1900 m",
  "3800m": "3800 m",
  custom: "Custom",
};

/** Get sub-type options for a given sport */
export function getSubTypeOptions(sport: string): { value: string; label: string }[] {
  switch (sport) {
    case "triathlon":
      return Object.entries(TRIATHLON_SUB_LABELS).map(([v, l]) => ({ value: v, label: l }));
    case "run":
      return Object.entries(RUN_SUB_LABELS).map(([v, l]) => ({ value: v, label: l }));
    case "bike":
      return Object.entries(BIKE_SUB_LABELS).map(([v, l]) => ({ value: v, label: l }));
    case "swim":
      return Object.entries(SWIM_SUB_LABELS).map(([v, l]) => ({ value: v, label: l }));
    default:
      return [];
  }
}

/** Get leg distances for a triathlon sub-type, or total distance for single sport */
export function getPresetDistances(sport: string, subType: string): {
  swimM?: number;
  bikeM?: number;
  runM?: number;
  totalM?: number;
} {
  if (sport === "triathlon") {
    const p = TRIATHLON_PRESETS[subType];
    if (p) return { swimM: p.swim, bikeM: p.bike, runM: p.run, totalM: p.swim + p.bike + p.run };
    return {};
  }
  if (sport === "run") {
    const d = RUN_PRESETS[subType];
    return d ? { runM: d, totalM: d } : {};
  }
  if (sport === "bike") {
    const d = BIKE_PRESETS[subType];
    return d ? { bikeM: d, totalM: d } : {};
  }
  if (sport === "swim") {
    const d = SWIM_PRESETS[subType];
    return d ? { swimM: d, totalM: d } : {};
  }
  return {};
}
