import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import type { Equipment } from "@/domain/types/equipment.types";

// ── Response types ─────────────────────────────────────────────────────

interface EquipmentListResponse {
  data: Equipment[];
}

interface EquipmentResponse {
  data: Equipment;
}

export interface EquipmentCreatePayload {
  name: string;
  equipmentType: string;
  brand?: string;
  model?: string;
  purchaseDate?: string;
  maxDistanceKm?: number | null;
  maxDurationHours?: number | null;
  notes?: string;
}

export type EquipmentUpdatePayload = Partial<Equipment>;

// ── Hooks ──────────────────────────────────────────────────────────────

export function useEquipment(athleteId: string | null) {
  return useQuery<EquipmentListResponse>({
    queryKey: ["equipment", athleteId],
    queryFn: () =>
      apiClient.get<EquipmentListResponse>(`/equipment/${athleteId}`),
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });
}

export function useCreateEquipment(athleteId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<EquipmentResponse, Error, EquipmentCreatePayload>({
    mutationFn: (body) =>
      apiClient.post<EquipmentResponse>(`/equipment/${athleteId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", athleteId] });
    },
  });
}

export function useUpdateEquipment(athleteId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<EquipmentResponse, Error, { id: string } & EquipmentUpdatePayload>({
    mutationFn: ({ id, ...body }) =>
      apiClient.put<EquipmentResponse>(`/equipment/${athleteId}/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", athleteId] });
    },
  });
}

export function useDeleteEquipment(athleteId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (equipmentId) =>
      apiClient.delete(`/equipment/${athleteId}/${equipmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", athleteId] });
    },
  });
}
