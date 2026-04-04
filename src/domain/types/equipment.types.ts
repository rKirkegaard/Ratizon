export interface Equipment {
  id: string;
  athleteId: string;
  name: string;
  equipmentType: "shoes" | "bike" | "wetsuit" | "watch" | "other";
  brand: string | null;
  model: string | null;
  purchaseDate: string | null;
  maxDistanceKm: number | null;
  maxDurationHours: number | null;
  currentDistanceKm: number;
  currentDurationHours: number;
  sessionCount: number;
  retired: boolean;
  notes: string | null;
  createdAt: string;
}

export interface SessionEquipment {
  id: string;
  sessionId: string;
  equipmentId: string;
  distanceKm: number | null;
  durationHours: number | null;
}

export interface EquipmentNotificationPrefs {
  id: string;
  athleteId: string;
  equipmentId: string;
  distanceThresholdKm: number | null;
  durationThresholdHours: number | null;
  enabled: boolean;
}
