import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";

export interface LLMSystemSettings {
  defaultProvider: string;
  defaultModel: string;
  hasOpenaiKey: boolean;
  hasAnthropicKey: boolean;
  globalMonthlyBudgetCents: number | null;
  defaultSystemContext: string | null;
  defaultTrainingDataRange: string;
}

export interface LLMAthletePreferences {
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

export interface LLMEffectiveConfig {
  provider: string;
  model: string;
  hasApiKey: boolean;
  systemContext: string | null;
  trainingDataRange: string;
  monthlyBudgetCents: number | null;
}

export interface LLMUsageStats {
  currentMonth: { totalCostCents: number; totalTokens: number; requestCount: number };
  limit: { limitCents: number | null; usagePct: number };
  byProvider: Array<{ provider: string; costCents: number; requests: number }>;
}

export interface LLMModels {
  openai: string[];
  anthropic: string[];
  google: string[];
  mistral: string[];
}

export function useLLMSettings() {
  return useQuery<LLMSystemSettings>({
    queryKey: ["llm-settings"],
    queryFn: () => apiClient.get<LLMSystemSettings>("/llm/settings"),
    staleTime: 60 * 1000,
  });
}

export function useUpdateLLMSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LLMSystemSettings & { openaiKey?: string; anthropicKey?: string }>) =>
      apiClient.put("/llm/settings", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["llm-settings"] }),
  });
}

export function useLLMModels() {
  return useQuery<LLMModels>({
    queryKey: ["llm-models"],
    queryFn: () => apiClient.get<LLMModels>("/llm/models"),
    staleTime: 10 * 60 * 1000,
  });
}

export function useLLMPreferences(athleteId: string | null) {
  return useQuery<LLMAthletePreferences>({
    queryKey: ["llm-preferences", athleteId],
    queryFn: () => apiClient.get<LLMAthletePreferences>(`/llm/preferences/${athleteId}`),
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });
}

export function useUpdateLLMPreferences(athleteId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LLMAthletePreferences>) =>
      apiClient.put(`/llm/preferences/${athleteId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["llm-preferences", athleteId] }),
  });
}

export function useLLMEffectiveConfig(athleteId: string | null) {
  return useQuery<LLMEffectiveConfig>({
    queryKey: ["llm-effective", athleteId],
    queryFn: () => apiClient.get<LLMEffectiveConfig>(`/llm/preferences/${athleteId}/effective`),
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });
}

export function useDeleteLLMPreferences(athleteId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete(`/llm/preferences/${athleteId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm-preferences", athleteId] });
      qc.invalidateQueries({ queryKey: ["llm-effective", athleteId] });
    },
  });
}

export function useLLMUsage(athleteId: string | null) {
  return useQuery<LLMUsageStats>({
    queryKey: ["llm-usage", athleteId],
    queryFn: () => apiClient.get<LLMUsageStats>(`/llm/usage/${athleteId}`),
    enabled: !!athleteId,
    staleTime: 30 * 1000,
  });
}
