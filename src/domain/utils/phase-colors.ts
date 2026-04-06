export const PHASE_COLORS: Record<string, string> = {
  base: "#3B82F6",
  build: "#F97316",
  peak: "#EF4444",
  race: "#EAB308",
  recovery: "#22C55E",
  transition: "#8B5CF6",
};

export const PHASE_LABELS: Record<string, string> = {
  base: "Base",
  build: "Opbygning",
  peak: "Peak",
  race: "Konkurrence",
  recovery: "Restitution",
  transition: "Overgang",
};

export function getPhaseForDate(
  dateStr: string,
  phases: Array<{ phaseType: string; startDate: string; endDate: string; phaseName: string }>
): { phaseType: string; phaseName: string; color: string } | null {
  const d = new Date(dateStr).getTime();
  for (const p of phases) {
    if (d >= new Date(p.startDate).getTime() && d <= new Date(p.endDate).getTime()) {
      return {
        phaseType: p.phaseType,
        phaseName: p.phaseName,
        color: PHASE_COLORS[p.phaseType] || "#6B7280",
      };
    }
  }
  return null;
}
