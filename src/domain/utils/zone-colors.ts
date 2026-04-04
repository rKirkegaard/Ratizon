type ZoneNumber = 1 | 2 | 3 | 4 | 5;

const zoneColorVars: Record<ZoneNumber, string> = {
  1: "var(--zone-1)",
  2: "var(--zone-2)",
  3: "var(--zone-3)",
  4: "var(--zone-4)",
  5: "var(--zone-5)",
};

const zoneLabels: Record<ZoneNumber, string> = {
  1: "Zone 1 - Restitution",
  2: "Zone 2 - Aerob base",
  3: "Zone 3 - Tempo",
  4: "Zone 4 - Taerskel",
  5: "Zone 5 - VO2max",
};

/**
 * Returnerer CSS variabel for zonens farve
 */
export function getZoneColor(zone: ZoneNumber): string {
  return zoneColorVars[zone];
}

/**
 * Returnerer dansk label for zone
 */
export function getZoneLabel(zone: ZoneNumber): string {
  return zoneLabels[zone];
}

/**
 * Returnerer alle zonefarver som array
 */
export function getAllZoneColors(): string[] {
  return [
    zoneColorVars[1],
    zoneColorVars[2],
    zoneColorVars[3],
    zoneColorVars[4],
    zoneColorVars[5],
  ];
}
