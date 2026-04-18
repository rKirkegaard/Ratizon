export interface Equipment {
  id: string;
  athleteId: string;
  name: string;
  equipmentType: string;
  brand: string | null;
  model: string | null;
  purchaseDate: string | null;
  maxDistanceKm: number | null;
  maxDurationHours: number | null;
  currentDistanceKm: number;
  currentDurationHours: number;
  sessionCount: number;
  retired: boolean;
  isDefaultFor: string | null;
  initialKm: number;
  notes: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface EquipmentStats extends Equipment {
  totalKm: number;
  totalHours: number;
  lastUsedAt: string | null;
}

export interface SessionEquipmentLink {
  id: string;
  sessionId: string;
  equipmentId: string;
  distanceKm: number | null;
  durationHours: number | null;
  segmentType: string | null;
  lapIndices: string | null;
  segmentMin: number | null;
  notes: string | null;
  equipmentName?: string;
  equipmentType?: string;
  maxDistanceKm?: number | null;
  currentDistanceKm?: number | null;
}

export interface EquipmentMonthlyUsage {
  month: string;
  distanceKm: number;
  durationHours: number;
  sessionCount: number;
}

export interface EquipmentSessionRow {
  sessionId: string;
  sport: string;
  title: string;
  startedAt: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  segmentType: string | null;
  segmentKm: number | null;
  lapIndices: string | null;
}

export interface EquipmentNotificationPrefs {
  id: string;
  athleteId: string;
  equipmentId: string;
  distanceThresholdKm: number | null;
  durationThresholdHours: number | null;
  enabled: boolean;
}
