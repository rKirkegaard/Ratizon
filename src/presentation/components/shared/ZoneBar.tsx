interface ZoneDistribution {
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
}

interface ZoneBarProps {
  distribution: ZoneDistribution;
  height?: number;
  showLabels?: boolean;
}

const zoneColors = [
  "var(--zone-1)",
  "var(--zone-2)",
  "var(--zone-3)",
  "var(--zone-4)",
  "var(--zone-5)",
];

export function ZoneBar({ distribution, height = 8, showLabels = false }: ZoneBarProps) {
  const zones = [
    distribution.zone1,
    distribution.zone2,
    distribution.zone3,
    distribution.zone4,
    distribution.zone5,
  ];
  const total = zones.reduce((a, b) => a + b, 0);

  return (
    <div data-testid="zone-bar" className="w-full">
      <div
        className="flex w-full overflow-hidden rounded-full"
        style={{ height: `${height}px` }}
      >
        {zones.map((value, i) => {
          const pct = total > 0 ? (value / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={i}
              style={{
                width: `${pct}%`,
                backgroundColor: zoneColors[i],
              }}
              title={`Zone ${i + 1}: ${Math.round(pct)}%`}
            />
          );
        })}
      </div>
      {showLabels && (
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          {zones.map((value, i) => {
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <span key={i} style={{ color: zoneColors[i] }}>
                Z{i + 1}: {pct}%
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ZoneBar;
