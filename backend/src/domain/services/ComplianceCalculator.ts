/**
 * ComplianceCalculator — scores how well an actual session matched the plan.
 *
 * Dimensions scored (0-100%):
 *  - Duration: tolerance ±10%
 *  - TSS: tolerance ±15%
 *  - Distance: tolerance ±10%
 *  - Zone match: dominant zone vs planned zone
 *
 * Weights: duration 30%, TSS 25%, distance 25%, zone 20%
 */

export interface ActualMetrics {
  durationSeconds: number;
  distanceMeters: number | null;
  tss: number | null;
  dominantZone: number | null; // 1-5
}

export interface PlannedMetrics {
  targetDurationSeconds: number | null;
  targetDistanceMeters: number | null;
  targetTss: number | null;
  targetZone: number | null; // 1-5 (primary target zone)
}

export interface ComplianceResult {
  overallPct: number;
  durationScore: number | null;
  tssScore: number | null;
  distanceScore: number | null;
  zoneScore: number | null;
}

function toleranceScore(actual: number, target: number, tolerancePct: number): number {
  if (target <= 0) return 1;
  const deviation = Math.abs(actual - target) / target;
  if (deviation <= tolerancePct) return 1;
  // Linear falloff beyond tolerance
  return Math.max(0, 1 - (deviation - tolerancePct) / tolerancePct);
}

function zoneMatchScore(actual: number | null, target: number | null): number | null {
  if (actual == null || target == null) return null;
  const diff = Math.abs(actual - target);
  if (diff === 0) return 1;
  if (diff === 1) return 0.5;
  return 0;
}

export function calculateCompliance(
  actual: ActualMetrics,
  planned: PlannedMetrics
): ComplianceResult {
  const scores: { score: number; weight: number }[] = [];

  let durationScore: number | null = null;
  let tssScore: number | null = null;
  let distanceScore: number | null = null;
  let zoneScoreVal: number | null = null;

  // Duration
  if (planned.targetDurationSeconds && planned.targetDurationSeconds > 0) {
    durationScore = toleranceScore(actual.durationSeconds, planned.targetDurationSeconds, 0.10);
    scores.push({ score: durationScore, weight: 30 });
  }

  // TSS
  if (planned.targetTss && planned.targetTss > 0 && actual.tss != null) {
    tssScore = toleranceScore(actual.tss, planned.targetTss, 0.15);
    scores.push({ score: tssScore, weight: 25 });
  }

  // Distance
  if (planned.targetDistanceMeters && planned.targetDistanceMeters > 0 && actual.distanceMeters != null) {
    distanceScore = toleranceScore(actual.distanceMeters, planned.targetDistanceMeters, 0.10);
    scores.push({ score: distanceScore, weight: 25 });
  }

  // Zone
  zoneScoreVal = zoneMatchScore(actual.dominantZone, planned.targetZone);
  if (zoneScoreVal != null) {
    scores.push({ score: zoneScoreVal, weight: 20 });
  }

  // Weighted average
  const totalWeight = scores.reduce((s, x) => s + x.weight, 0);
  const overallPct = totalWeight > 0
    ? Math.round(scores.reduce((s, x) => s + x.score * x.weight, 0) / totalWeight * 100)
    : 0;

  return {
    overallPct,
    durationScore: durationScore != null ? Math.round(durationScore * 100) : null,
    tssScore: tssScore != null ? Math.round(tssScore * 100) : null,
    distanceScore: distanceScore != null ? Math.round(distanceScore * 100) : null,
    zoneScore: zoneScoreVal != null ? Math.round(zoneScoreVal * 100) : null,
  };
}
