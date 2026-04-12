/**
 * Centralized trend calculation utilities.
 * All linear regression and trend classification logic lives here.
 */

export interface RegressionResult {
  slope: number;
  intercept: number;
  predictions: number[];
}

/** Ordinary least-squares linear regression */
export function linearRegression(points: { x: number; y: number }[]): RegressionResult {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, predictions: points.map((p) => p.y) };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, predictions: points.map((p) => p.y) };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept, predictions: points.map((p) => slope * p.x + intercept) };
}

/**
 * Compute a linear trend line from date/value pairs.
 * Returns predicted values mapped to the same indices as input.
 */
export function linearTrend(points: { date: string; value: number }[]): number[] {
  if (points.length < 2) return points.map((p) => p.value);
  const input = points.map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
  return linearRegression(input).predictions;
}

export type TrendDirection = "improving" | "stable" | "declining";

export interface TrendSummary {
  direction: TrendDirection;
  changePct: number;
  pointCount: number;
}

/**
 * Classify a trend based on first and last predicted values.
 * > +3% = improving, < -3% = declining, otherwise stable.
 */
/**
 * Compute trend line for scatter chart data.
 * Input: array of {x, y} points. Output: array of {x, ty} predictions.
 * Compatible with existing chart components that expect this format.
 */
export function scatterTrend(points: { x: number; y: number }[]): { x: number; ty: number }[] {
  if (points.length < 2) return [];
  const result = linearRegression(points);
  return points.map((p, i) => ({ x: p.x, ty: result.predictions[i] }));
}

export function classifyTrend(firstPred: number, lastPred: number, pointCount: number): TrendSummary {
  const changePct = firstPred > 0 ? ((lastPred - firstPred) / firstPred) * 100 : 0;
  let direction: TrendDirection = "stable";
  if (changePct > 3) direction = "improving";
  else if (changePct < -3) direction = "declining";
  return { direction, changePct: Math.round(changePct * 10) / 10, pointCount };
}
