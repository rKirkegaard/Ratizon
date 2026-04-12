/**
 * RaceCTLEstimator — estimates CTL an athlete needs for a triathlon
 * race at a given target time, based on their baselines.
 *
 * Model chain:
 *   1. Target time → split times per discipline (uses entered splits if available)
 *   2. Split times → race intensity fractions (IF), capped at physiological limits
 *   3. IF → race TSS per discipline (all use IF^2)
 *   4. Total race TSS → required peak CTL via distance-scaled tolerance factor
 *   5. Peak CTL → phase CTL targets via periodization fractions
 *
 * Sources: Coggan/Allen power model, Friel periodization,
 *          Seiler intensity distribution, coaching heuristics.
 *
 * Key insight: for Ironman-distance races the total race TSS (typically 450-600)
 * is far above CTL because the athlete spends 8-17 hours at sub-threshold intensity.
 * The tolerance factor (race TSS / required CTL) scales from ~1.0 for sprint up to
 * ~5.0 for full Ironman, reflecting that longer sub-threshold events accumulate
 * more TSS than the athlete's chronic load would suggest.
 */

// ── Input types ─────────────────────────────────────────────────────

export interface AthleteBaselines {
  ftp: number;                    // watts
  swimCssSec: number;             // seconds per 100m
  runThresholdPaceSec: number;    // seconds per km
  weightKg: number;
}

export interface RaceTargets {
  raceType: "sprint" | "olympic" | "quarter" | "half" | "full";
  targetTimeSec: number;          // total race time in seconds
  // Optional per-discipline split times (seconds) — preferred over derivation
  swimTimeSec?: number;           // entered swim split in seconds
  bikeTimeSec?: number;           // entered bike split in seconds
  runTimeSec?: number;            // entered run split in seconds
  // Optional overrides (from race plan, if available)
  swimPaceSec?: number;           // sec/100m — overrides derived pace
  bikePowerW?: number;            // watts — overrides derived power
  runPaceSec?: number;            // sec/km — overrides derived pace
}

export interface PhaseSpec {
  id: string;
  phaseType: string;
  startDate: string;
  endDate: string;
}

// ── Output types ────────────────────────────────────────────────────

export interface RaceTSSEstimate {
  swimTSS: number;
  bikeTSS: number;
  runTSS: number;
  totalTSS: number;
  swimIF: number;
  bikeIF: number;
  runIF: number;
}

export interface DerivedThresholds {
  requiredFtp: number;
  requiredRunThresholdPaceSec: number;
  requiredSwimCssSec: number;
}

export interface CTLEstimateResult {
  requiredCTL: number;
  ctlRange: { min: number; max: number };
  raceTSS: RaceTSSEstimate;
  derivedThresholds: DerivedThresholds;
  completionFactor: number;
  confidence: "high" | "moderate" | "low";
  warnings: string[];
  phaseTargets: PhaseCTLTarget[];
  weeklyTSSNeeded: number;
  requiredRampRate: number;
}

export interface PhaseCTLTarget {
  phaseId: string;
  phaseType: string;
  ctlTarget: number;
  weeklyTSSTarget: number;
}

// ── Race-type configuration ─────────────────────────────────────────

interface RaceConfig {
  swimDistM: number;
  bikeDistM: number;
  runDistM: number;
  swimSplitPct: number;       // fraction of total time (fallback when no splits entered)
  bikeSplitPct: number;
  runSplitPct: number;
  typicalBikeIF: number;      // typical race intensity factor for this distance
  typicalRunIF: number;       // typical run IF for this distance
  typicalSwimIF: number;      // typical swim IF for this distance
  maxBikeIF: number;          // physiological cap on bike IF
  maxRunIF: number;           // physiological cap on run IF
  maxSwimIF: number;          // physiological cap on swim IF
  toleranceFactor: number;    // race TSS / required CTL ratio
                              // Higher = longer sub-threshold events accumulate
                              // more TSS relative to CTL
                              // Sprint ~1.0: short/intense, race TSS ≈ CTL
                              // Ironman ~5.0: long sub-threshold, race TSS >> CTL
}

const RACE_CONFIGS: Record<string, RaceConfig> = {
  full: {
    swimDistM: 3800, bikeDistM: 180000, runDistM: 42195,
    swimSplitPct: 0.11, bikeSplitPct: 0.52, runSplitPct: 0.35,
    typicalBikeIF: 0.72, typicalRunIF: 0.82, typicalSwimIF: 0.85,
    maxBikeIF: 0.82, maxRunIF: 0.92, maxSwimIF: 0.95,
    toleranceFactor: 5.0,
  },
  quarter: {
    swimDistM: 950, bikeDistM: 45000, runDistM: 10000,
    swimSplitPct: 0.12, bikeSplitPct: 0.50, runSplitPct: 0.36,
    typicalBikeIF: 0.82, typicalRunIF: 0.92, typicalSwimIF: 0.92,
    maxBikeIF: 0.90, maxRunIF: 0.96, maxSwimIF: 0.97,
    toleranceFactor: 2.0,
  },
  half: {
    swimDistM: 1900, bikeDistM: 90000, runDistM: 21097,
    swimSplitPct: 0.10, bikeSplitPct: 0.52, runSplitPct: 0.36,
    typicalBikeIF: 0.78, typicalRunIF: 0.88, typicalSwimIF: 0.88,
    maxBikeIF: 0.85, maxRunIF: 0.94, maxSwimIF: 0.96,
    toleranceFactor: 3.0,
  },
  olympic: {
    swimDistM: 1500, bikeDistM: 40000, runDistM: 10000,
    swimSplitPct: 0.14, bikeSplitPct: 0.48, runSplitPct: 0.36,
    typicalBikeIF: 0.88, typicalRunIF: 0.95, typicalSwimIF: 0.95,
    maxBikeIF: 0.95, maxRunIF: 0.98, maxSwimIF: 0.99,
    toleranceFactor: 1.5,
  },
  sprint: {
    swimDistM: 750, bikeDistM: 20000, runDistM: 5000,
    swimSplitPct: 0.14, bikeSplitPct: 0.48, runSplitPct: 0.36,
    typicalBikeIF: 0.92, typicalRunIF: 0.97, typicalSwimIF: 0.97,
    maxBikeIF: 1.0, maxRunIF: 1.0, maxSwimIF: 1.0,
    toleranceFactor: 1.0,
  },
};

// Phase CTL as fraction of peak CTL (periodization model)
const PHASE_CTL_FRACTIONS: Record<string, number> = {
  base: 0.65,
  build: 0.85,
  peak: 1.0,
  race: 0.95,
  recovery: 0.50,
  transition: 0.40,
};

// ── Core estimation ─────────────────────────────────────────────────

/**
 * Estimate required CTL from race targets and athlete baselines.
 *
 * Key fixes over previous version:
 * - Uses entered split times (swimTimeSec, bikeTimeSec, runTimeSec) when available
 * - All disciplines use TSS = hours * IF^2 * 100 (consistent formula)
 * - IF values are capped at physiological maximums per race distance
 * - Tolerance factor scales properly: sprint=1.0, olympic=1.5, half=3.0, full=5.0
 * - Warnings emitted when targets exceed physiological limits
 */
export function estimateCTLRequirement(
  baselines: AthleteBaselines,
  targets: RaceTargets,
  currentCTL: number,
  weeksToRace: number,
  phases: PhaseSpec[],
): CTLEstimateResult {
  const config = RACE_CONFIGS[targets.raceType] ?? RACE_CONFIGS.full;
  const warnings: string[] = [];

  // 1. Split times — prefer entered splits, fall back to percentage-based derivation
  const swimSec = (targets.swimTimeSec && targets.swimTimeSec > 0)
    ? targets.swimTimeSec
    : targets.targetTimeSec * config.swimSplitPct;
  const bikeSec = (targets.bikeTimeSec && targets.bikeTimeSec > 0)
    ? targets.bikeTimeSec
    : targets.targetTimeSec * config.bikeSplitPct;
  const runSec = (targets.runTimeSec && targets.runTimeSec > 0)
    ? targets.runTimeSec
    : targets.targetTimeSec * config.runSplitPct;

  // 2. Derive race paces / power
  const hasBikePowerOverride = targets.bikePowerW != null && targets.bikePowerW > 0;
  const hasSwimPaceOverride = targets.swimPaceSec != null && targets.swimPaceSec > 0;
  const hasRunPaceOverride = targets.runPaceSec != null && targets.runPaceSec > 0;

  const raceBikePower = hasBikePowerOverride
    ? targets.bikePowerW!
    : estimateBikePower(config.bikeDistM, bikeSec, baselines.weightKg);
  const raceSwimPaceSec = hasSwimPaceOverride
    ? targets.swimPaceSec!
    : (swimSec / (config.swimDistM / 100));
  const raceRunPaceSec = hasRunPaceOverride
    ? targets.runPaceSec!
    : (runSec / (config.runDistM / 1000));

  if (!hasBikePowerOverride) {
    warnings.push(
      `Cykelwatt er estimeret til ${Math.round(raceBikePower)}W fra splittid og aerodynamisk model. ` +
      "Tilfoej en raceplan med din faktiske maalpower for praecis estimering."
    );
  }

  // 3. Calculate raw intensity fractions
  // For pace-based (swim/run): IF = threshold_pace / race_pace
  //   threshold is faster (lower seconds) → IF < 1.0 when racing slower than threshold
  // For power-based (bike): IF = race_power / FTP
  const rawBikeIF = baselines.ftp > 0
    ? raceBikePower / baselines.ftp
    : config.typicalBikeIF;
  const rawRunIF = baselines.runThresholdPaceSec > 0
    ? baselines.runThresholdPaceSec / raceRunPaceSec
    : config.typicalRunIF;
  const rawSwimIF = baselines.swimCssSec > 0
    ? baselines.swimCssSec / raceSwimPaceSec
    : config.typicalSwimIF;

  // 4. Cap IF at physiological maximums and warn
  const bikeIF = Math.min(rawBikeIF, config.maxBikeIF);
  const runIF = Math.min(rawRunIF, config.maxRunIF);
  const swimIF = Math.min(rawSwimIF, config.maxSwimIF);

  if (rawBikeIF > config.maxBikeIF) {
    warnings.push(
      `Cykel-IF ${round2(rawBikeIF)} overskrider realistisk max (${config.maxBikeIF}) for ${targets.raceType}. ` +
      `Maaltiden kraever at koere ved ${Math.round(rawBikeIF * 100)}% af FTP i ${round2(bikeSec / 3600)} timer. ` +
      `Enten er FTP for lav, eller cykelmaaltiden er for ambitioes.`
    );
  }
  if (rawRunIF > config.maxRunIF) {
    warnings.push(
      `Loeb-IF ${round2(rawRunIF)} overskrider realistisk max (${config.maxRunIF}) for ${targets.raceType}. ` +
      `Maaltiden kraever at loebe ved ${Math.round(rawRunIF * 100)}% af taerskeltempo.`
    );
  }
  if (rawSwimIF > config.maxSwimIF) {
    warnings.push(
      `Svoem-IF ${round2(rawSwimIF)} overskrider realistisk max (${config.maxSwimIF}) for ${targets.raceType}. ` +
      `Maaltiden kraever at svoemme hurtigere end CSS over ${round2(swimSec / 60)} minutter.`
    );
  }

  // 5. Race TSS per discipline — all use the same formula: hours * IF^2 * 100
  const swimHrs = swimSec / 3600;
  const bikeHrs = bikeSec / 3600;
  const runHrs = runSec / 3600;

  const swimTSS = Math.round(swimHrs * Math.pow(swimIF, 2) * 100);
  const bikeTSS = Math.round(bikeHrs * Math.pow(bikeIF, 2) * 100);
  const runTSS = Math.round(runHrs * Math.pow(runIF, 2) * 100);
  const totalTSS = swimTSS + bikeTSS + runTSS;

  // 6. Required CTL from race TSS using distance-scaled tolerance factor
  // The tolerance factor represents how much race TSS an athlete can accumulate
  // relative to their CTL. Longer sub-threshold events have a higher factor:
  //   Sprint  (1.0): race TSS ≈ CTL — short high-intensity race
  //   Olympic (1.5): race TSS ~1.5x CTL
  //   Half    (3.0): race TSS ~3x CTL — moderate sub-threshold duration
  //   Full    (5.0): race TSS ~5x CTL — 8-17 hours, all sub-threshold
  const tf = config.toleranceFactor;
  const requiredCTL = Math.round(totalTSS / tf);
  const ctlMin = Math.round(totalTSS / (tf * 1.15));   // conservative (easier target)
  const ctlMax = Math.round(totalTSS / (tf * 0.85));   // aggressive (harder target)

  // 7. Derived thresholds (what baselines would be needed to hit typical IFs)
  const requiredFtp = raceBikePower / config.typicalBikeIF;
  const requiredRunThresholdPaceSec = raceRunPaceSec * config.typicalRunIF;
  const requiredSwimCssSec = raceSwimPaceSec * config.typicalSwimIF;

  // 8. Weekly TSS and ramp rate
  const weeklyTSSNeeded = requiredCTL * 7;
  const ctlGap = Math.max(0, requiredCTL - currentCTL);
  // Effective ramp accounting for 3:1 load/recovery pattern
  const requiredRampRate = weeksToRace > 3
    ? round2(ctlGap / (weeksToRace - 3) * (4 / 3))
    : round2(ctlGap);

  // 9. Confidence assessment
  const hasAllBaselines = baselines.ftp > 0 &&
    baselines.swimCssSec > 0 &&
    baselines.runThresholdPaceSec > 0;
  const hasEnteredSplits = !!(targets.swimTimeSec && targets.bikeTimeSec && targets.runTimeSec);
  const noWarnings = warnings.length === 0;
  const confidence = hasAllBaselines && noWarnings ? "high"
    : hasAllBaselines && hasEnteredSplits ? "moderate" : "low";

  // 10. Phase CTL targets
  const phaseTargets = phases.map((p) => {
    const fraction = PHASE_CTL_FRACTIONS[p.phaseType] ?? 0.7;
    const ctlTarget = Math.round(requiredCTL * fraction);
    return {
      phaseId: p.id,
      phaseType: p.phaseType,
      ctlTarget,
      weeklyTSSTarget: Math.round(ctlTarget * 7),
    };
  });

  return {
    requiredCTL,
    ctlRange: { min: ctlMin, max: ctlMax },
    raceTSS: {
      swimTSS, bikeTSS, runTSS, totalTSS,
      swimIF: round2(swimIF),
      bikeIF: round2(bikeIF),
      runIF: round2(runIF),
    },
    derivedThresholds: {
      requiredFtp: Math.round(requiredFtp),
      requiredRunThresholdPaceSec: Math.round(requiredRunThresholdPaceSec),
      requiredSwimCssSec: Math.round(requiredSwimCssSec),
    },
    completionFactor: tf,
    confidence,
    warnings,
    phaseTargets,
    weeklyTSSNeeded,
    requiredRampRate,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Simplified flat-course bike power estimate from distance, time, weight */
function estimateBikePower(distM: number, timeSec: number, weightKg: number): number {
  const speedMs = distM / timeSec;
  const CdA = 0.30;
  const rho = 1.2;
  const Crr = 0.005;
  const totalMass = weightKg + 10; // bike + gear
  return CdA * 0.5 * rho * Math.pow(speedMs, 3) +
    Crr * totalMass * 9.81 * speedMs;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
