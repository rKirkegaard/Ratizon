/**
 * LLM Preferences Service — manages system-level and per-athlete LLM settings.
 * Handles API key encryption/decryption with AES-256-CBC.
 */

import crypto from "crypto";
import { db } from "../../infrastructure/database/connection.js";
import { llmSettings, athleteLlmPreferences } from "../../infrastructure/database/schema/llm.schema.js";
import { eq } from "drizzle-orm";

// ── Types ──────────────────────────────────────────────────────────────

export interface SystemSettingsDTO {
  id: string;
  defaultProvider: string;
  defaultModel: string;
  hasOpenaiKey: boolean;
  hasAnthropicKey: boolean;
  globalMonthlyBudgetCents: number | null;
  defaultSystemContext: string | null;
  defaultTrainingDataRange: string;
}

export interface SystemSettingsRaw extends SystemSettingsDTO {
  openaiKey: string | null;
  anthropicKey: string | null;
}

export interface AthletePreferencesDTO {
  id: string;
  athleteId: string;
  inheritFromSystem: boolean;
  inheritApiKey: boolean;
  inheritProvider: boolean;
  inheritModel: boolean;
  inheritContext: boolean;
  preferredProvider: string | null;
  preferredModel: string | null;
  monthlyBudgetCents: number | null;
  customSystemContext: string | null;
  trainingDataRange: string | null;
}

// ── Encryption helpers ─────────────────────────────────────────────────

const ALGORITHM = "aes-256-cbc";

function getEncryptionKey(): Buffer {
  const key = process.env.API_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    // Fallback for dev — NOT secure for production
    return Buffer.from("dev-fallback-key-32-chars-long!!".slice(0, 32));
  }
  return Buffer.from(key.slice(0, 32));
}

export function encryptApiKey(plainKey: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(plainKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  return { encrypted, iv: iv.toString("hex") };
}

export function decryptApiKey(encrypted: string, iv: string): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ── System settings ────────────────────────────────────────────────────

export async function getSystemSettings(): Promise<SystemSettingsDTO | null> {
  const [row] = await db.select().from(llmSettings).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    defaultProvider: row.defaultProvider,
    defaultModel: row.defaultModel,
    hasOpenaiKey: !!(row.openaiKeyEncrypted && row.openaiKeyIv),
    hasAnthropicKey: !!(row.anthropicKeyEncrypted && row.anthropicKeyIv),
    globalMonthlyBudgetCents: row.globalMonthlyBudgetCents,
    defaultSystemContext: row.defaultSystemContext,
    defaultTrainingDataRange: row.defaultTrainingDataRange,
  };
}

/** Get system settings WITH decrypted keys — only use server-side for LLM calls */
export async function getSystemSettingsWithKeys(): Promise<SystemSettingsRaw | null> {
  const [row] = await db.select().from(llmSettings).limit(1);
  if (!row) return null;

  let openaiKey: string | null = null;
  let anthropicKey: string | null = null;

  if (row.openaiKeyEncrypted && row.openaiKeyIv) {
    try { openaiKey = decryptApiKey(row.openaiKeyEncrypted, row.openaiKeyIv); } catch { /* ignore */ }
  }
  if (row.anthropicKeyEncrypted && row.anthropicKeyIv) {
    try { anthropicKey = decryptApiKey(row.anthropicKeyEncrypted, row.anthropicKeyIv); } catch { /* ignore */ }
  }

  return {
    id: row.id,
    defaultProvider: row.defaultProvider,
    defaultModel: row.defaultModel,
    hasOpenaiKey: !!openaiKey,
    hasAnthropicKey: !!anthropicKey,
    openaiKey,
    anthropicKey,
    globalMonthlyBudgetCents: row.globalMonthlyBudgetCents,
    defaultSystemContext: row.defaultSystemContext,
    defaultTrainingDataRange: row.defaultTrainingDataRange,
  };
}

export async function updateSystemSettings(updates: Record<string, unknown>): Promise<void> {
  const data: Record<string, unknown> = { updatedAt: new Date() };

  if (updates.defaultProvider !== undefined) data.defaultProvider = updates.defaultProvider;
  if (updates.defaultModel !== undefined) data.defaultModel = updates.defaultModel;
  if (updates.globalMonthlyBudgetCents !== undefined) data.globalMonthlyBudgetCents = updates.globalMonthlyBudgetCents;
  if (updates.defaultSystemContext !== undefined) data.defaultSystemContext = updates.defaultSystemContext;
  if (updates.defaultTrainingDataRange !== undefined) data.defaultTrainingDataRange = updates.defaultTrainingDataRange;

  // Encrypt API keys if provided
  if (typeof updates.openaiApiKey === "string") {
    if (updates.openaiApiKey.trim()) {
      const { encrypted, iv } = encryptApiKey(updates.openaiApiKey as string);
      data.openaiKeyEncrypted = encrypted;
      data.openaiKeyIv = iv;
    } else {
      data.openaiKeyEncrypted = null;
      data.openaiKeyIv = null;
    }
  }
  if (typeof updates.anthropicApiKey === "string") {
    if (updates.anthropicApiKey.trim()) {
      const { encrypted, iv } = encryptApiKey(updates.anthropicApiKey as string);
      data.anthropicKeyEncrypted = encrypted;
      data.anthropicKeyIv = iv;
    } else {
      data.anthropicKeyEncrypted = null;
      data.anthropicKeyIv = null;
    }
  }

  // Upsert — check if row exists
  const [existing] = await db.select({ id: llmSettings.id }).from(llmSettings).limit(1);
  if (existing) {
    await db.update(llmSettings).set(data).where(eq(llmSettings.id, existing.id));
  } else {
    await db.insert(llmSettings).values(data as any);
  }
}

// ── Athlete preferences ────────────────────────────────────────────────

export async function getAthletePreferences(athleteId: string): Promise<AthletePreferencesDTO | null> {
  const [row] = await db.select().from(athleteLlmPreferences).where(eq(athleteLlmPreferences.athleteId, athleteId)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    athleteId: row.athleteId,
    inheritFromSystem: row.inheritFromSystem,
    inheritApiKey: row.inheritApiKey,
    inheritProvider: row.inheritProvider,
    inheritModel: row.inheritModel,
    inheritContext: row.inheritContext,
    preferredProvider: row.preferredProvider,
    preferredModel: row.preferredModel,
    monthlyBudgetCents: row.monthlyBudgetCents,
    customSystemContext: row.customSystemContext,
    trainingDataRange: row.trainingDataRange,
  };
}

export async function upsertAthletePreferences(
  athleteId: string,
  data: Partial<Omit<AthletePreferencesDTO, "id" | "athleteId">>
): Promise<void> {
  const existing = await getAthletePreferences(athleteId);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.inheritFromSystem !== undefined) updates.inheritFromSystem = data.inheritFromSystem;
  if (data.inheritApiKey !== undefined) updates.inheritApiKey = data.inheritApiKey;
  if (data.inheritProvider !== undefined) updates.inheritProvider = data.inheritProvider;
  if (data.inheritModel !== undefined) updates.inheritModel = data.inheritModel;
  if (data.inheritContext !== undefined) updates.inheritContext = data.inheritContext;
  if (data.preferredProvider !== undefined) updates.preferredProvider = data.preferredProvider;
  if (data.preferredModel !== undefined) updates.preferredModel = data.preferredModel;
  if (data.monthlyBudgetCents !== undefined) updates.monthlyBudgetCents = data.monthlyBudgetCents;
  if (data.customSystemContext !== undefined) updates.customSystemContext = data.customSystemContext;
  if (data.trainingDataRange !== undefined) updates.trainingDataRange = data.trainingDataRange;

  if (existing) {
    await db.update(athleteLlmPreferences).set(updates).where(eq(athleteLlmPreferences.athleteId, athleteId));
  } else {
    await db.insert(athleteLlmPreferences).values({ athleteId, ...updates } as any);
  }
}

export async function deleteAthletePreferences(athleteId: string): Promise<void> {
  await db.delete(athleteLlmPreferences).where(eq(athleteLlmPreferences.athleteId, athleteId));
}
