/**
 * Threshold progression — calculates where an athlete's baselines
 * should be today to be on track for race-day targets.
 *
 * Uses sqrt(t/T) curve: front-loads early gains, plateaus later.
 * Source: coaching heuristic — early adaptation is faster (neuromuscular,
 * technique, easy aerobic volume), later gains slow (ceiling effect).
 */

export interface ThresholdTarget {
  current: number;
  required: number;
  expectedToday: number;
  lower: number;
  upper: number;
  progressPct: number;    // 0-1, how far through the training block
  onTrack: boolean;       // is current >= expectedToday (accounting for direction)
}

export interface ThresholdProgressionResult {
  ftp: ThresholdTarget;
  runPace: ThresholdTarget;
  swimCss: ThresholdTarget;
  daysElapsed: number;
  daysTotal: number;
}

/**
 * Calculate expected thresholds for today using sqrt progression curve.
 *
 * For "higher is better" metrics (FTP): required > current, expectedToday between.
 * For "lower is better" metrics (run pace, swim CSS): required < current, expectedToday between.
 * The sqrt formula handles both correctly since it interpolates from current to required.
 */
export function calcExpectedThresholds(
  current: { ftp: number; runPaceSec: number; swimCssSec: number },
  required: { ftp: number; runPaceSec: number; swimCssSec: number },
  trainingStartDate: Date,
  raceDate: Date,
  today: Date = new Date(),
): ThresholdProgressionResult {
  const startMs = trainingStartDate.getTime();
  const raceMs = raceDate.getTime();
  const todayMs = today.getTime();

  const daysTotal = Math.max(1, Math.round((raceMs - startMs) / 86400000));
  const daysElapsed = Math.max(0, Math.round((todayMs - startMs) / 86400000));
  const progressPct = Math.min(1, daysElapsed / daysTotal);

  // sqrt curve: front-loads progress
  const sqrtProgress = Math.sqrt(progressPct);

  function calcTarget(curr: number, req: number, isLowerBetter: boolean): ThresholdTarget {
    const expected = curr + sqrtProgress * (req - curr);

    // Margin: +/- 3% for power, +/- 5 sec for pace
    const margin = isLowerBetter
      ? Math.abs(req - curr) * 0.05  // 5% of the gap for pace
      : Math.abs(req - curr) * 0.03; // 3% of the gap for power

    const lower = isLowerBetter ? expected - margin : expected - margin;
    const upper = isLowerBetter ? expected + margin : expected + margin;

    // On track: for FTP (higher=better), current should be >= expectedToday
    // For pace (lower=better), current should be <= expectedToday
    const onTrack = isLowerBetter ? curr <= expected + margin : curr >= expected - margin;

    return {
      current: curr,
      required: req,
      expectedToday: Math.round(expected * 10) / 10,
      lower: Math.round(lower * 10) / 10,
      upper: Math.round(upper * 10) / 10,
      progressPct,
      onTrack,
    };
  }

  return {
    ftp: calcTarget(current.ftp, required.ftp, false),
    runPace: calcTarget(current.runPaceSec, required.runPaceSec, true),
    swimCss: calcTarget(current.swimCssSec, required.swimCssSec, true),
    daysElapsed,
    daysTotal,
  };
}
