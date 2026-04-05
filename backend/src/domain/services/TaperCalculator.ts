/**
 * TaperCalculator — generates an exponential TSS reduction plan for race taper.
 *
 * Standard taper models:
 *  - Aggressive: 60% → 20% → 15% of peak weekly TSS
 *  - Moderate:   60% → 40% → 25%
 *  - Conservative: 70% → 50% → 35%
 *
 * Projects CTL/ATL/TSB through the taper using exponential decay.
 */

const CTL_DECAY = 42;
const ATL_DECAY = 7;

export type TaperProfile = "aggressive" | "moderate" | "conservative";

export interface TaperParams {
  raceDate: Date;
  taperWeeks: 2 | 3;
  currentWeeklyTSS: number;
  currentCTL: number;
  currentATL: number;
  profile: TaperProfile;
}

export interface DailyTarget {
  date: string;
  tss: number;
  isRestDay: boolean;
}

export interface TaperWeek {
  weekNumber: number;
  weeklyTss: number;
  reductionPct: number;
  dailyTargets: DailyTarget[];
}

export interface PMCProjection {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

export interface TaperPlan {
  weeks: TaperWeek[];
  projection: PMCProjection[];
  raceDayProjection: PMCProjection;
}

const REDUCTION_PROFILES: Record<TaperProfile, Record<2 | 3, number[]>> = {
  aggressive:   { 2: [0.40, 0.15], 3: [0.60, 0.20, 0.15] },
  moderate:     { 2: [0.50, 0.25], 3: [0.60, 0.40, 0.25] },
  conservative: { 2: [0.60, 0.35], 3: [0.70, 0.50, 0.35] },
};

// Distribute weekly TSS across 7 days: 2 rest days, 2 easy, 2 moderate, 1 key
const DAY_WEIGHTS = [0, 0.15, 0.20, 0, 0.25, 0.25, 0.15]; // Mon=rest, Thu=rest

function distributeWeeklyTSS(weeklyTss: number): { tss: number; isRest: boolean }[] {
  return DAY_WEIGHTS.map((w) => ({
    tss: Math.round(weeklyTss * w),
    isRest: w === 0,
  }));
}

export function generateTaper(params: TaperParams): TaperPlan {
  const { raceDate, taperWeeks, currentWeeklyTSS, currentCTL, currentATL, profile } = params;

  const reductions = REDUCTION_PROFILES[profile][taperWeeks];
  const weeks: TaperWeek[] = [];
  const allDailyTargets: DailyTarget[] = [];

  // Calculate taper start date (taperWeeks before race)
  const taperStart = new Date(raceDate);
  taperStart.setDate(taperStart.getDate() - taperWeeks * 7);

  for (let w = 0; w < taperWeeks; w++) {
    const reductionPct = reductions[w];
    const weeklyTss = Math.round(currentWeeklyTSS * reductionPct);
    const distribution = distributeWeeklyTSS(weeklyTss);

    const dailyTargets: DailyTarget[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(taperStart);
      date.setDate(date.getDate() + w * 7 + d);
      const target: DailyTarget = {
        date: date.toISOString().split("T")[0],
        tss: distribution[d].tss,
        isRestDay: distribution[d].isRest,
      };
      dailyTargets.push(target);
      allDailyTargets.push(target);
    }

    weeks.push({
      weekNumber: w + 1,
      weeklyTss,
      reductionPct: Math.round(reductionPct * 100),
      dailyTargets,
    });
  }

  // Project CTL/ATL/TSB through taper
  const projection: PMCProjection[] = [];
  let ctl = currentCTL;
  let atl = currentATL;

  for (const day of allDailyTargets) {
    ctl = ctl + (day.tss - ctl) / CTL_DECAY;
    atl = atl + (day.tss - atl) / ATL_DECAY;
    const tsb = ctl - atl;
    projection.push({
      date: day.date,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round(tsb * 10) / 10,
    });
  }

  const raceDayProjection = projection[projection.length - 1] || {
    date: raceDate.toISOString().split("T")[0],
    ctl: currentCTL,
    atl: currentATL,
    tsb: currentCTL - currentATL,
  };

  return { weeks, projection, raceDayProjection };
}
