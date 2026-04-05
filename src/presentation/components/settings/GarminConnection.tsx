import { useState } from "react";
import {
  useGarminStatus,
  useGarminConnect,
  useGarminDisconnect,
  useGarminSync,
} from "@/application/hooks/garmin/useGarmin";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Unplug } from "lucide-react";

interface GarminConnectionProps {
  athleteId: string | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GarminConnection({ athleteId }: GarminConnectionProps) {
  const { data: status, isLoading } = useGarminStatus(athleteId);
  const connectMutation = useGarminConnect();
  const disconnectMutation = useGarminDisconnect(athleteId);
  const syncMutation = useGarminSync(athleteId);
  const [syncResult, setSyncResult] = useState<{
    received: number;
    imported: number;
  } | null>(null);

  if (isLoading) {
    return (
      <div data-testid="garmin-connection" className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Henter Garmin-status...</span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="garmin-connection" className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-blue-500"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Garmin Connect</h3>
            {status?.connected ? (
              <p className="text-sm text-green-500">
                Tilsluttet
                {status.garminUserId && (
                  <span className="ml-1 text-muted-foreground">({status.garminUserId})</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Ikke tilsluttet</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {status?.connected ? (
            <>
              <button
                data-testid="garmin-sync"
                onClick={() => {
                  setSyncResult(null);
                  syncMutation.mutate(undefined, {
                    onSuccess: (data: any) => {
                      setSyncResult({
                        received: data?.activitiesReceived ?? 0,
                        imported: data?.activitiesImported ?? 0,
                      });
                    },
                  });
                }}
                disabled={syncMutation.isPending}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Synkroniser
              </button>
              <button
                data-testid="garmin-disconnect"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="flex items-center gap-1.5 rounded-md border border-red-500/30 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                <Unplug className="h-4 w-4" />
                Afbryd
              </button>
            </>
          ) : (
            <button
              data-testid="garmin-connect"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {connectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Tilslut Garmin
            </button>
          )}
        </div>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
          <p className="text-foreground">
            Modtaget: {syncResult.received} aktiviteter, importeret: {syncResult.imported}
          </p>
        </div>
      )}

      {/* Connection details */}
      {status?.connected && (
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          {status.connectedAt && (
            <p>Tilsluttet: {formatDate(status.connectedAt)}</p>
          )}
          {status.lastSyncAt && (
            <p>Sidst synkroniseret: {formatDate(status.lastSyncAt)}</p>
          )}

          {/* Recent sync log */}
          {status.recentSyncs.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Seneste synkroniseringer
              </p>
              <div className="space-y-1">
                {status.recentSyncs.map((sync, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded bg-muted/30 px-3 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {sync.errors ? (
                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      )}
                      <span className="capitalize">{sync.syncType}</span>
                      <span>
                        {sync.activitiesImported}/{sync.activitiesReceived} importeret
                      </span>
                    </div>
                    <span>{formatDate(sync.syncedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
