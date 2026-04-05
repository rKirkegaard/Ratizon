export type SegmentType = "swim" | "t1" | "bike" | "t2" | "run";

export interface RacePlan {
  id: string;
  athleteId: string;
  goalId: string | null;
  swimPace: number | null;
  t1Target: number | null;
  bikePower: number | null;
  bikePace: number | null;
  t2Target: number | null;
  runPace: number | null;
  targetSwimTime: number | null;
  targetBikeTime: number | null;
  targetRunTime: number | null;
  targetTotalTime: number | null;
  nutritionStrategy: Record<string, unknown> | null;
  hydrationStrategy: Record<string, unknown> | null;
  notes: string | null;
  nutritionItems?: RaceNutritionItem[];
}

export interface RaceNutritionItem {
  id: string;
  racePlanId: string;
  segmentType: SegmentType;
  timeOffsetMin: number;
  item: string;
  calories: number | null;
  sodiumMg: number | null;
  fluidMl: number | null;
  notes: string | null;
}

export interface RaceSegment {
  type: SegmentType;
  label: string;
  distance: number;
  startSec: number;
  durationSec: number;
  pace: string | null;
}

export interface NutritionTimelineItem {
  id: string;
  raceClockMin: number;
  segmentType: SegmentType;
  item: string;
  calories: number | null;
  sodiumMg: number | null;
  fluidMl: number | null;
  notes: string | null;
}

export interface RaceTimeline {
  segments: RaceSegment[];
  totalTimeSec: number;
  nutritionTimeline: NutritionTimelineItem[];
  totals: {
    calories: number;
    sodiumMg: number;
    fluidMl: number;
    caloriesPerHourBike: number;
    caloriesPerHourRun: number;
    fluidPerHourBike: number;
    fluidPerHourRun: number;
  };
}
