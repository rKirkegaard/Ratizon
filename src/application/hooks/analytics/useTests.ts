import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";

export interface PerformanceTest {
  id: string;
  athleteId: string;
  testType: string;
  testDate: string;
  protocol: string | null;
  sport: string;
  resultValue: number | null;
  resultUnit: string | null;
  heartRateAvg: number | null;
  heartRateMax: number | null;
  lactateData: Array<{ step: number; value: number; lactate: number; hr: number }> | null;
  baselineField: string | null;
  baselineValue: number | null;
  baselineApplied: string | null;
  notes: string | null;
}

export function useTests(athleteId: string | null, testType?: string) {
  return useQuery<PerformanceTest[]>({
    queryKey: ["tests", athleteId, testType],
    queryFn: async () => {
      const params = testType ? `?testType=${testType}` : "";
      const raw = await apiClient.get(`/tests/${athleteId}${params}`);
      return Array.isArray(raw) ? raw : [];
    },
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });
}

export function useCreateTest(athleteId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PerformanceTest>) =>
      apiClient.post(`/tests/${athleteId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tests", athleteId] }),
  });
}

export function useDeleteTest(athleteId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (testId: string) =>
      apiClient.delete(`/tests/${athleteId}/${testId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tests", athleteId] }),
  });
}

export function useApplyBaseline(athleteId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (testId: string) =>
      apiClient.post(`/tests/${athleteId}/${testId}/apply-baseline`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tests", athleteId] });
      qc.invalidateQueries({ queryKey: ["athlete-profile", athleteId] });
    },
  });
}
