import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SportConfig } from "@/domain/types/sport.types";

interface AthleteState {
  selectedAthleteId: string | null;
  setSelectedAthleteId: (id: string | null) => void;
  sportConfigs: SportConfig[];
  setSportConfigs: (configs: SportConfig[]) => void;
  getSportColor: (sportKey: string) => string;
  getSportIcon: (sportKey: string) => string;
  getActiveSports: () => SportConfig[];
  getSportsWithPages: () => SportConfig[];
  sportColors: {
    swim: string;
    bike: string;
    run: string;
  };
  zoneColors: {
    zone1: string;
    zone2: string;
    zone3: string;
    zone4: string;
    zone5: string;
  };
}

const DEFAULT_SPORT_COLORS: Record<string, string> = {
  swim: "var(--sport-swim)",
  bike: "var(--sport-bike)",
  run: "var(--sport-run)",
  strength: "var(--sport-strength)",
};

const DEFAULT_SPORT_ICONS: Record<string, string> = {
  swim: "waves",
  bike: "bike",
  run: "footprints",
  strength: "dumbbell",
};

const FALLBACK_COLOR = "var(--sport-other)";
const FALLBACK_ICON = "activity";

export const useAthleteStore = create<AthleteState>()(
  persist(
    (set, get) => ({
      selectedAthleteId: null,
      setSelectedAthleteId: (id) => set({ selectedAthleteId: id }),
      sportConfigs: [],
      setSportConfigs: (configs) => set({ sportConfigs: configs }),
      getSportColor: (sportKey: string) => {
        const config = get().sportConfigs.find(
          (c) => c.sport_key === sportKey && c.is_active
        );
        if (config) return config.color;
        return DEFAULT_SPORT_COLORS[sportKey] ?? FALLBACK_COLOR;
      },
      getSportIcon: (sportKey: string) => {
        const config = get().sportConfigs.find(
          (c) => c.sport_key === sportKey && c.is_active
        );
        if (config) return config.icon;
        return DEFAULT_SPORT_ICONS[sportKey] ?? FALLBACK_ICON;
      },
      getActiveSports: () => {
        return get()
          .sportConfigs.filter((c) => c.is_active)
          .sort((a, b) => a.sort_order - b.sort_order);
      },
      getSportsWithPages: () => {
        return get()
          .sportConfigs.filter((c) => c.is_active && c.dedicated_page)
          .sort((a, b) => a.sort_order - b.sort_order);
      },
      sportColors: {
        swim: "var(--sport-swim)",
        bike: "var(--sport-bike)",
        run: "var(--sport-run)",
      },
      zoneColors: {
        zone1: "var(--zone-1)",
        zone2: "var(--zone-2)",
        zone3: "var(--zone-3)",
        zone4: "var(--zone-4)",
        zone5: "var(--zone-5)",
      },
    }),
    {
      name: "ratizon-athlete",
    }
  )
);
