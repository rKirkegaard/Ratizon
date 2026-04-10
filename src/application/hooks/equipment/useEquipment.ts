import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";
import type {
  Equipment,
  EquipmentStats,
  EquipmentMonthlyUsage,
  EquipmentSessionRow,
  EquipmentNotificationPrefs,
} from "@/domain/types/equipment.types";

// ── Create/Update payloads ────────────────────────────────────────────

export interface EquipmentCreatePayload {
  name: string;
  equipmentType: string;
  brand?: string;
  model?: string;
  purchaseDate?: string;
  maxDistanceKm?: number | null;
  maxDurationHours?: number | null;
  isDefaultFor?: string | null;
  initialKm?: number;
  notes?: string;
}

export type EquipmentUpdatePayload = Partial<Equipment>;

// ── List / CRUD hooks ─────────────────────────────────────────────────

export function useEquipment(athleteId: string | null) {
  return useQuery<Equipment[]>({
    queryKey: ["equipment", athleteId],
    queryFn: () => apiClient.get<Equipment[]>(`/equipment/${athleteId}`),
    enabled: !!athleteId,
    staleTime: 60 * 1000,
  });
}

export function useEquipmentStats(athleteId: string | null, equipmentId: string | null) {
  return useQuery<EquipmentStats>({
    queryKey: ["equipment-stats", athleteId, equipmentId],
    queryFn: () => apiClient.get<EquipmentStats>(`/equipment/${athleteId}/${equipmentId}/stats`),
    enabled: !!athleteId && !!equipmentId,
    staleTime: 60 * 1000,
  });
}

export function useEquipmentMonthlyUsage(athleteId: string | null, equipmentId: string | null) {
  return useQuery<EquipmentMonthlyUsage[]>({
    queryKey: ["equipment-monthly", athleteId, equipmentId],
    queryFn: () => apiClient.get<EquipmentMonthlyUsage[]>(`/equipment/${athleteId}/${equipmentId}/monthly-usage`),
    enabled: !!athleteId && !!equipmentId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useEquipmentSessions(athleteId: string | null, equipmentId: string | null, page = 1) {
  return useQuery<{ data: EquipmentSessionRow[]; total: number; page: number; limit: number }>({
    queryKey: ["equipment-sessions", athleteId, equipmentId, page],
    queryFn: () => apiClient.get(`/equipment/${athleteId}/${equipmentId}/sessions?page=${page}&limit=20`),
    enabled: !!athleteId && !!equipmentId,
    staleTime: 60 * 1000,
  });
}

export function useCreateEquipment(athleteId: string | null) {
  const qc = useQueryClient();
  return useMutation<Equipment, Error, EquipmentCreatePayload>({
    mutationFn: (body) => apiClient.post<Equipment>(`/equipment/${athleteId}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["equipment"] }); },
  });
}

export function useUpdateEquipment(athleteId: string | null) {
  const qc = useQueryClient();
  return useMutation<Equipment, Error, { id: string } & EquipmentUpdatePayload>({
    mutationFn: ({ id, ...body }) => apiClient.put<Equipment>(`/equipment/${athleteId}/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["equipment"] }); },
  });
}

export function useDeleteEquipment(athleteId: string | null) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (equipmentId) => apiClient.delete(`/equipment/${athleteId}/${equipmentId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["equipment"] }); },
  });
}

export function useArchiveEquipment(athleteId: string | null) {
  const qc = useQueryClient();
  return useMutation<Equipment, Error, string>({
    mutationFn: (equipmentId) => apiClient.put<Equipment>(`/equipment/${athleteId}/${equipmentId}/archive`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["equipment"] }); },
  });
}

export function useRestoreEquipment(athleteId: string | null) {
  const qc = useQueryClient();
  return useMutation<Equipment, Error, string>({
    mutationFn: (equipmentId) => apiClient.put<Equipment>(`/equipment/${athleteId}/${equipmentId}/restore`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["equipment"] }); },
  });
}

// ── Notification prefs ────────────────────────────────────────────────

export function useNotificationPrefs(athleteId: string | null, equipmentId: string | null) {
  return useQuery<EquipmentNotificationPrefs>({
    queryKey: ["equipment-notif-prefs", athleteId, equipmentId],
    queryFn: () => apiClient.get<EquipmentNotificationPrefs>(`/equipment/${athleteId}/${equipmentId}/notifications`),
    enabled: !!athleteId && !!equipmentId,
  });
}

export function useUpsertNotificationPrefs(athleteId: string | null, equipmentId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<EquipmentNotificationPrefs>) =>
      apiClient.put(`/equipment/${athleteId}/${equipmentId}/notifications`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["equipment-notif-prefs"] }); },
  });
}
