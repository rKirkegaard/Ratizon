import { Bell, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import type { AlertItem } from "@/application/hooks/useDashboard";

interface CoachInboxProps {
  alerts: AlertItem[];
  totalAlerts: number;
  onDismiss?: (alertId: string) => void;
}

const severityConfig: Record<
  string,
  { icon: typeof AlertTriangle; color: string; bgColor: string }
> = {
  critical: { icon: AlertCircle, color: "text-red-500", bgColor: "bg-red-500/10" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  info: { icon: Info, color: "text-blue-400", bgColor: "bg-blue-500/10" },
};

function formatAlertTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  if (diffMins < 60) return `${diffMins} min siden`;
  if (diffHours < 24) return `${diffHours} t siden`;
  return date.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

export default function CoachInbox({ alerts, totalAlerts, onDismiss }: CoachInboxProps) {
  return (
    <div data-testid="coach-inbox" className="rounded-lg border border-border/50 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Coach Inbox</h3>
          {totalAlerts > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
              {totalAlerts}
            </span>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen aktive advarsler</p>
      ) : (
        <ul className="space-y-2">
          {alerts.slice(0, 5).map((alert) => {
            const config = severityConfig[alert.severity] ?? severityConfig.info;
            const SeverityIcon = config.icon;
            return (
              <li
                key={alert.id}
                data-testid="coach-inbox-alert"
                className={`group flex items-start gap-3 rounded-md px-3 py-2 ${config.bgColor}`}
              >
                <SeverityIcon size={16} className={`mt-0.5 shrink-0 ${config.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{alert.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatAlertTime(alert.timestamp)}</p>
                </div>
                {onDismiss && (
                  <button
                    data-testid={`dismiss-alert-${alert.id}`}
                    onClick={() => onDismiss(alert.id)}
                    className="shrink-0 rounded p-1 text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-foreground transition-all"
                  >
                    <X size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
