export interface GarminConnectionStatus {
  connected: boolean;
  garminUserId: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  recentSyncs: GarminSyncLogEntry[];
}

export interface GarminSyncLogEntry {
  syncType: string;
  activitiesReceived: number;
  activitiesImported: number;
  errors: string | null;
  syncedAt: string;
}
