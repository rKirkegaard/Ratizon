import { db } from "../../infrastructure/database/connection.js";
import { llmUsage, athleteLlmPreferences, llmSettings } from "../../infrastructure/database/schema/llm.schema.js";
import { calculateCostCents } from "./LLMPricingService.js";
import { eq, and, gte, sql } from "drizzle-orm";

export interface UsageRecord {
  athleteId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  requestType: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log a usage record (fire-and-forget, should not block main request)
 */
export async function logUsage(record: UsageRecord): Promise<void> {
  const costCents = calculateCostCents(record.model, record.inputTokens, record.outputTokens);

  await db.insert(llmUsage).values({
    athleteId: record.athleteId,
    provider: record.provider,
    model: record.model,
    inputTokens: record.inputTokens,
    outputTokens: record.outputTokens,
    totalTokens: record.inputTokens + record.outputTokens,
    costCents,
    requestType: record.requestType,
    metadata: record.metadata ?? null,
  });
}

/**
 * Non-blocking usage logging
 */
export function logUsageAsync(record: UsageRecord): void {
  setImmediate(() => {
    logUsage(record).catch((err) => {
      console.error("LLM usage logging failed:", err.message);
    });
  });
}

/**
 * Check if athlete has exceeded their monthly budget.
 * Returns { allowed, currentCostCents, limitCents, usagePct }
 */
export async function checkMonthlyLimit(athleteId: string): Promise<{
  allowed: boolean;
  currentCostCents: number;
  limitCents: number | null;
  usagePct: number;
}> {
  // Get athlete's budget limit
  const [prefs] = await db
    .select()
    .from(athleteLlmPreferences)
    .where(eq(athleteLlmPreferences.athleteId, athleteId))
    .limit(1);

  const [systemSettings] = await db.select().from(llmSettings).limit(1);

  let limitCents: number | null = null;

  if (prefs && !prefs.inheritFromSystem && prefs.monthlyBudgetCents != null) {
    limitCents = prefs.monthlyBudgetCents;
  } else if (systemSettings?.globalMonthlyBudgetCents != null) {
    limitCents = systemSettings.globalMonthlyBudgetCents;
  }

  // Get current month's usage
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${llmUsage.costCents}), 0)`,
    })
    .from(llmUsage)
    .where(
      and(
        eq(llmUsage.athleteId, athleteId),
        gte(llmUsage.createdAt, monthStart)
      )
    );

  const currentCostCents = result[0]?.total ?? 0;
  const usagePct = limitCents ? (currentCostCents / limitCents) * 100 : 0;

  return {
    allowed: limitCents == null || currentCostCents < limitCents,
    currentCostCents,
    limitCents,
    usagePct,
  };
}

/**
 * Get usage stats for an athlete
 */
export async function getUsageStats(athleteId: string): Promise<{
  currentMonth: { totalCostCents: number; totalTokens: number; requestCount: number };
  limit: { limitCents: number | null; usagePct: number };
  byProvider: Array<{ provider: string; costCents: number; requests: number }>;
}> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Current month totals
  const [totals] = await db
    .select({
      totalCost: sql<number>`COALESCE(SUM(${llmUsage.costCents}), 0)`,
      totalTokens: sql<number>`COALESCE(SUM(${llmUsage.totalTokens}), 0)`,
      requestCount: sql<number>`COUNT(*)`,
    })
    .from(llmUsage)
    .where(
      and(eq(llmUsage.athleteId, athleteId), gte(llmUsage.createdAt, monthStart))
    );

  // By provider
  const byProvider = await db
    .select({
      provider: llmUsage.provider,
      costCents: sql<number>`COALESCE(SUM(${llmUsage.costCents}), 0)`,
      requests: sql<number>`COUNT(*)`,
    })
    .from(llmUsage)
    .where(
      and(eq(llmUsage.athleteId, athleteId), gte(llmUsage.createdAt, monthStart))
    )
    .groupBy(llmUsage.provider);

  const limitCheck = await checkMonthlyLimit(athleteId);

  return {
    currentMonth: {
      totalCostCents: totals?.totalCost ?? 0,
      totalTokens: totals?.totalTokens ?? 0,
      requestCount: Number(totals?.requestCount ?? 0),
    },
    limit: {
      limitCents: limitCheck.limitCents,
      usagePct: limitCheck.usagePct,
    },
    byProvider: byProvider.map((r) => ({
      provider: r.provider,
      costCents: r.costCents,
      requests: Number(r.requests),
    })),
  };
}
