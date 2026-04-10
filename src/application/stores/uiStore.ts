import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface UiState {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  aiPanelOpen: boolean;
  setAiPanelOpen: (open: boolean) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  collapsedSections: Record<string, boolean>;
  toggleSection: (section: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      aiPanelOpen: false,
      setAiPanelOpen: (open) => set({ aiPanelOpen: open }),
      collapsedSections: {},
      toggleSection: (section) =>
        set((state) => ({
          collapsedSections: {
            ...state.collapsedSections,
            [section]: !state.collapsedSections[section],
          },
        })),
      theme: "dark",
      setTheme: (theme) => {
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
        set({ theme });
      },
    }),
    {
      name: "ratizon-ui",
    }
  )
);
