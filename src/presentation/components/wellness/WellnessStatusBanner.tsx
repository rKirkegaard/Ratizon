import { ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import type { HRVGateResponse } from "@/application/hooks/wellness/useWellness";

interface WellnessStatusBannerProps {
  gate: HRVGateResponse;
  isLoading: boolean;
}

const STATUS_CONFIG: Record<
  "green" | "amber" | "red",
  {
    bg: string;
    border: string;
    text: string;
    icon: typeof ShieldCheck;
    label: string;
  }
> = {
  green: {
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    text: "text-green-700 dark:text-green-400",
    icon: ShieldCheck,
    label: "Alt ser godt ud",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-700 dark:text-amber-400",
    icon: AlertTriangle,
    label: "Vaer opmaerksom",
  },
  red: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-700 dark:text-red-400",
    icon: ShieldAlert,
    label: "Krop under pres",
  },
};

function BannerSkeleton() {
  return (
    <div
      data-testid="wellness-status-banner-skeleton"
      className="animate-pulse rounded-lg border border-border/50 bg-muted p-4"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted-foreground/20" />
        <div className="space-y-2">
          <div className="h-5 w-40 rounded bg-muted-foreground/20" />
          <div className="h-3 w-64 rounded bg-muted-foreground/20" />
        </div>
      </div>
    </div>
  );
}

export default function WellnessStatusBanner({
  gate,
  isLoading,
}: WellnessStatusBannerProps) {
  if (isLoading) return <BannerSkeleton />;

  const config = STATUS_CONFIG[gate.gate];
  const Icon = config.icon;

  return (
    <div
      data-testid="wellness-status-banner"
      className={`rounded-lg border ${config.border} ${config.bg} p-4`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bg}`}
        >
          <Icon size={22} className={config.text} />
        </div>
        <div>
          <h3 className={`text-base font-semibold ${config.text}`}>
            {config.label}
          </h3>
          <p className="text-sm text-muted-foreground">
            {gate.recommendation}
          </p>
          {gate.baseline != null && gate.currentHrv != null && (
            <p className="mt-1 text-xs text-muted-foreground">
              HRV: {Math.round(gate.currentHrv)} ms (baseline:{" "}
              {Math.round(gate.baseline)} &plusmn;{" "}
              {gate.baselineSd != null ? Math.round(gate.baselineSd) : "–"} ms)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
