import { useState } from "react";
import { useAthleteStore } from "@/application/stores/athleteStore";

interface ZoneColorPickerProps {
  onColorsChange?: (colors: Record<string, string>) => void;
}

const ZONE_LABELS = [
  { key: "zone1", label: "Zone 1", desc: "Aktiv restitution" },
  { key: "zone2", label: "Zone 2", desc: "Aerob udholdenhed" },
  { key: "zone3", label: "Zone 3", desc: "Tempo" },
  { key: "zone4", label: "Zone 4", desc: "Laktattaerskel" },
  { key: "zone5", label: "Zone 5", desc: "VO2max" },
];

const PRESET_COLORS = [
  "#3A7BFF",
  "#28CF59",
  "#F6D74A",
  "#F57C00",
  "#D32F2F",
  "#9C27B0",
  "#00BCD4",
  "#E91E63",
  "#4CAF50",
  "#FF9800",
  "#607D8B",
  "#8BC34A",
];

export default function ZoneColorPicker({ onColorsChange }: ZoneColorPickerProps) {
  const zoneColors = useAthleteStore((s) => s.zoneColors);

  const [colors, setColors] = useState<Record<string, string>>({
    zone1: getComputedColor("--zone-1"),
    zone2: getComputedColor("--zone-2"),
    zone3: getComputedColor("--zone-3"),
    zone4: getComputedColor("--zone-4"),
    zone5: getComputedColor("--zone-5"),
  });

  const [editingZone, setEditingZone] = useState<string | null>(null);

  function getComputedColor(varName: string): string {
    if (typeof document === "undefined") return "#888";
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    return raw || "#888";
  }

  function handleColorChange(zoneKey: string, color: string) {
    const updated = { ...colors, [zoneKey]: color };
    setColors(updated);

    // Update CSS var
    const cssVar = `--${zoneKey.replace("zone", "zone-")}`;
    document.documentElement.style.setProperty(cssVar, color);

    onColorsChange?.(updated);
  }

  return (
    <div data-testid="zone-color-picker" className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Zone-farver</h3>

      {/* Color ribbon preview */}
      <div className="mb-4 flex h-8 overflow-hidden rounded-lg">
        {ZONE_LABELS.map((z) => (
          <div
            key={z.key}
            className="flex-1 cursor-pointer transition-opacity hover:opacity-80"
            style={{ backgroundColor: colors[z.key] }}
            onClick={() => setEditingZone(editingZone === z.key ? null : z.key)}
            title={`${z.label}: ${z.desc}`}
          />
        ))}
      </div>

      {/* Zone labels */}
      <div className="mb-4 grid grid-cols-5 gap-1 text-center text-xs text-muted-foreground">
        {ZONE_LABELS.map((z) => (
          <div key={z.key}>
            <p className="font-medium text-foreground">{z.label}</p>
            <p className="text-[10px]">{z.desc}</p>
          </div>
        ))}
      </div>

      {/* Color picker for selected zone */}
      {editingZone && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-foreground">
            Vaelg farve for{" "}
            {ZONE_LABELS.find((z) => z.key === editingZone)?.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleColorChange(editingZone, c)}
                className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                  colors[editingZone] === c
                    ? "border-white ring-2 ring-primary"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
            <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-muted-foreground text-xs text-muted-foreground hover:border-foreground">
              <input
                type="color"
                value={colors[editingZone]}
                onChange={(e) => handleColorChange(editingZone, e.target.value)}
                className="sr-only"
              />
              +
            </label>
          </div>
        </div>
      )}

      {/* Mini preview bars */}
      <div className="mt-4 space-y-1">
        <p className="mb-1 text-xs text-muted-foreground">Forhåndsvisning</p>
        {ZONE_LABELS.map((z) => (
          <div key={z.key} className="flex items-center gap-2">
            <span className="w-12 text-xs text-muted-foreground">{z.label}</span>
            <div className="flex-1">
              <div
                className="h-3 rounded"
                style={{
                  backgroundColor: colors[z.key],
                  width: `${(ZONE_LABELS.indexOf(z) + 1) * 20}%`,
                  opacity: 0.8,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
