import { Flame, Target, Flag } from "lucide-react";
import type { MotivationData } from "@/application/hooks/useDashboard";

interface MotivationStripProps {
  motivation: MotivationData;
}

export default function MotivationStrip({ motivation }: MotivationStripProps) {
  return (
    <div
      data-testid="motivation-strip"
      className="rounded-lg border border-border/50 bg-card p-4"
    >
      <div className="flex flex-wrap items-center gap-6">
        {/* Streak */}
        <div className="flex items-center gap-2" data-testid="motivation-streak">
          <Flame size={18} className="text-orange-500" />
          <div>
            <p className="text-xs text-muted-foreground">Streak</p>
            <p className="text-sm font-semibold text-foreground">
              {motivation.streak_days} dage i traek
            </p>
          </div>
        </div>

        {/* CTL % of target */}
        <div className="flex items-center gap-2" data-testid="motivation-ctl-target">
          <Target size={18} className="text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">CTL maal</p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-accent">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, Math.round(motivation.ctl_pct_of_target))}%`,
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {Math.round(motivation.ctl_pct_of_target)}%
              </span>
            </div>
          </div>
        </div>

        {/* Race countdown */}
        {motivation.race_name && motivation.race_days_remaining != null && (
          <div className="flex items-center gap-2" data-testid="motivation-race">
            <Flag size={18} className="text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">{motivation.race_name}</p>
              <p className="text-sm font-semibold text-foreground">
                {motivation.race_days_remaining} dage til start
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
