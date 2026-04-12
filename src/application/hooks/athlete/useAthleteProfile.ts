import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/application/api/client";

// ── Types ──────────────────────────────────────────────────────────────

export interface AthleteProfileData {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  dateOfBirth: string | null;
  gender: string | null;
  weight: number | null;
  height: number | null;
  restingHr: number | null;
  maxHr: number | null;
  ftp: number | null;
  lthr: number | null;
  swimCss: number | null;
  runThresholdPace: string | null;  // M:SS format, e.g. "4:15"
  trainingPhilosophy: string | null;
  weeklyVolumeMin: number | null;
  weeklyVolumeMax: number | null;
  cycleType: string | null;
  poolUrls: { url: string; active: boolean }[] | null;
  createdAt: string;
  updatedAt: string;
}

interface ProfileResponse {
  data: AthleteProfileData;
}

export interface ProfileUpdatePayload {
  displayName?: string;
  email?: string;
  maxHr?: number | null;
  ftp?: number | null;
  lthr?: number | null;
  swimCss?: number | null;
  restingHr?: number | null;
  weight?: number | null;
  height?: number | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  runThresholdPace?: string | null;
  trainingPhilosophy?: string | null;
  weeklyVolumeMin?: number | null;
  weeklyVolumeMax?: number | null;
  cycleType?: string | null;
  poolUrls?: { url: string; active: boolean }[] | null;
}

// ── Hooks ──────────────────────────────────────────────────────────────

export function useAthleteProfile(athleteId: string | null) {
  return useQuery<ProfileResponse>({
    queryKey: ["athlete-profile", athleteId],
    queryFn: () =>
      apiClient.get<ProfileResponse>(`/athletes/${athleteId}/profile`),
    enabled: !!athleteId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateAthleteProfile(athleteId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<ProfileResponse, Error, ProfileUpdatePayload>({
    mutationFn: (body) =>
      apiClient.put<ProfileResponse>(`/athletes/${athleteId}/profile`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete-profile", athleteId] });
    },
  });
}
