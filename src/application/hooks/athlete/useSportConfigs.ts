import { useEffect, useState, useCallback } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";
import type { SportConfig, SportPreset } from "@/domain/types/sport.types";

const API_BASE = "/api/sports";

interface UseSportConfigsReturn {
  sportConfigs: SportConfig[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSportConfigs(athleteId: string | null): UseSportConfigsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sportConfigs = useAthleteStore((s) => s.sportConfigs);
  const setSportConfigs = useAthleteStore((s) => s.setSportConfigs);

  const fetchConfigs = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/${athleteId}`);
      if (!response.ok) {
        throw new Error(`Fejl ved hentning af sportsindstillinger: ${response.status}`);
      }
      const json = await response.json();
      setSportConfigs(json.data as SportConfig[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ukendt fejl";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [athleteId, setSportConfigs]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  return { sportConfigs, loading, error, refetch: fetchConfigs };
}

interface UseApplySportPresetReturn {
  applyPreset: (preset: SportPreset) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useApplySportPreset(athleteId: string | null): UseApplySportPresetReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSportConfigs = useAthleteStore((s) => s.setSportConfigs);

  const applyPreset = useCallback(
    async (preset: SportPreset) => {
      if (!athleteId) return;
      if (preset === "custom") return;

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/${athleteId}/preset/${preset}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          throw new Error(`Fejl ved anvendelse af preset: ${response.status}`);
        }
        const json = await response.json();
        setSportConfigs(json.data as SportConfig[]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Ukendt fejl";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [athleteId, setSportConfigs]
  );

  return { applyPreset, loading, error };
}
