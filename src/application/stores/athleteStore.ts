import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AthleteState {
  selectedAthleteId: string | null;
  setSelectedAthleteId: (id: string | null) => void;
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

export const useAthleteStore = create<AthleteState>()(
  persist(
    (set) => ({
      selectedAthleteId: null,
      setSelectedAthleteId: (id) => set({ selectedAthleteId: id }),
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
