import { TrafficLight } from "@/presentation/components/shared/TrafficLight";
import type { WellnessData } from "@/application/hooks/useDashboard";

interface WellnessStripProps {
  wellness: WellnessData;
}

export default function WellnessStrip({ wellness }: WellnessStripProps) {
  const cards = [
    {
      label: "HRV",
      value: wellness.hrv ?? "–",
      unit: "ms",
      gate: wellness.hrv_gate,
    },
    {
      label: "Hvilepuls",
      value: wellness.resting_hr ?? "–",
      unit: "bpm",
      gate: wellness.hr_gate,
    },
    {
      label: "Sovn",
      value: wellness.sleep_hours != null ? wellness.sleep_hours.toFixed(1) : "–",
      unit: "timer",
      gate: wellness.sleep_gate,
    },
    {
      label: "Stress",
      value: wellness.stress ?? "–",
      unit: "",
      gate: wellness.stress_gate,
    },
  ];

  return (
    <div data-testid="wellness-strip" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          data-testid={`wellness-card-${card.label.toLowerCase()}`}
          className={`rounded-lg border bg-card p-4 ${
            card.label === "HRV" && card.gate === "red"
              ? "border-red-500"
              : "border-border/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            <TrafficLight status={card.gate} size={10} />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{card.value}</span>
            {card.unit && (
              <span className="text-sm text-muted-foreground">{card.unit}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
