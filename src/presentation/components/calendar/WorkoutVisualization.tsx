import { useMemo } from "react";
import type { SessionBlock } from "@/domain/types/training.types";
import { calcBlocksTss, calcBlocksDistance } from "@/domain/utils/tssCalculator";

interface WorkoutVisualizationProps {
  blocks: SessionBlock[];
  sport?: string;
  thresholdPaceSec?: number | null; // athlete's threshold pace in seconds/km for rTSS
}

const ZONE_COLORS: Record<number, string> = {
  1: "#3A7BFF", 2: "#28CF59", 3: "#F6D74A", 4: "#F57C00", 5: "#D32F2F",
};
const ZONE_HEIGHTS: Record<number, number> = {
  1: 25, 2: 40, 3: 55, 4: 75, 5: 95,
};
const TYPE_LABELS: Record<string, string> = {
  warmup: "Opvarmning", main: "Hoveddel", interval: "Interval",
  recovery: "Recovery", cooldown: "Nedkoeling",
};

function fmtDur(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (s === 0) return `${m} min`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// (TSS + distance calculated by shared tssCalculator.ts)

export default function WorkoutVisualization({ blocks, sport, thresholdPaceSec }: WorkoutVisualizationProps) {
  // Expand blocks into timeline segments
  const segments = useMemo(() => {
    const segs: Array<{ zone: number; durationSeconds: number; type: string; isRest: boolean; blockIdx: number }> = [];
    blocks.forEach((b, bi) => {
      const zone = b.targetHrZone ?? (b.type === "warmup" || b.type === "cooldown" || b.type === "recovery" ? 1 : 2);
      const reps = b.type === "interval" && b.repeatCount ? b.repeatCount : 1;
      for (let r = 0; r < reps; r++) {
        segs.push({ zone, durationSeconds: b.durationSeconds, type: b.type, isRest: false, blockIdx: bi });
        if (b.type === "interval" && b.restSeconds) {
          segs.push({ zone: 1, durationSeconds: b.restSeconds, type: "rest", isRest: true, blockIdx: bi });
        }
      }
    });
    return segs;
  }, [blocks]);

  const totalDuration = segments.reduce((s, seg) => s + seg.durationSeconds, 0);

  const zoneTime = useMemo(() => {
    const zt: Record<number, number> = {};
    for (const seg of segments) {
      zt[seg.zone] = (zt[seg.zone] ?? 0) + seg.durationSeconds;
    }
    return zt;
  }, [segments]);

  if (blocks.length === 0) return null;

  // Running time markers for the profile
  const timeMarkers = useMemo(() => {
    const markers: Array<{ pct: number; label: string }> = [{ pct: 0, label: "0" }];
    let cumSec = 0;
    blocks.forEach((b) => {
      const blockTotal = b.durationSeconds * (b.repeatCount ?? 1) + (b.restSeconds ?? 0) * Math.max((b.repeatCount ?? 1) - 1, 0);
      cumSec += blockTotal;
      const pct = (cumSec / totalDuration) * 100;
      if (pct > 5 && pct < 95) markers.push({ pct, label: fmtDur(cumSec) });
    });
    markers.push({ pct: 100, label: fmtDur(totalDuration) });
    return markers;
  }, [blocks, totalDuration]);

  return (
    <div data-testid="workout-visualization" className="space-y-4">

      {/* ── Intensity profile ─────────────────────────────────────── */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Intensitetsprofil</div>
        <div className="relative rounded-lg bg-muted/15 border border-border/30 px-2 pt-2 pb-5" style={{ height: 100 }}>
          <div className="flex items-end h-full gap-[2px]">
            {segments.map((seg, i) => {
              const widthPct = (seg.durationSeconds / totalDuration) * 100;
              const heightPct = ZONE_HEIGHTS[seg.zone] ?? 30;
              const showLabel = widthPct > 8 && !seg.isRest;
              return (
                <div
                  key={i}
                  className="relative rounded-sm"
                  style={{
                    width: `${Math.max(widthPct, 0.8)}%`,
                    height: `${heightPct}%`,
                    backgroundColor: ZONE_COLORS[seg.zone] ?? "#888",
                    opacity: seg.isRest ? 0.2 : 0.9,
                  }}
                  title={`${seg.type} — ${fmtDur(seg.durationSeconds)} Z${seg.zone}`}
                >
                  {showLabel && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white/90 drop-shadow-sm">Z{seg.zone}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Time markers below */}
          <div className="absolute bottom-0 left-2 right-2 h-4">
            {timeMarkers.map((m, i) => (
              <span key={i} className="absolute text-[8px] text-muted-foreground/50 -translate-x-1/2" style={{ left: `${m.pct}%` }}>
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Block detail cards ────────────────────────────────────── */}
      <div className="space-y-2">
        {blocks.map((blk, i) => {
          const zone = blk.targetHrZone ?? (blk.type === "warmup" || blk.type === "cooldown" || blk.type === "recovery" ? 1 : 2);
          const zoneColor = ZONE_COLORS[zone] ?? "#888";
          const isInterval = blk.type === "interval" && blk.repeatCount && blk.repeatCount > 1;
          const totalBlockSec = blk.durationSeconds * (blk.repeatCount ?? 1) + (blk.restSeconds ?? 0) * (blk.repeatCount ?? 1);
          const isMinor = blk.type === "warmup" || blk.type === "cooldown" || blk.type === "recovery";

          return (
            <div key={i} className={`rounded-lg overflow-hidden ${isMinor ? "opacity-70" : ""}`}>
              {/* Block header with zone color band */}
              <div className="flex items-center gap-3 px-3 py-2" style={{ backgroundColor: `${zoneColor}15`, borderLeft: `4px solid ${zoneColor}` }}>
                {/* Zone badge */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white" style={{ backgroundColor: zoneColor }}>
                  Z{zone}
                </div>

                {/* Label line */}
                <div className="flex-1 min-w-0">
                  {isInterval ? (
                    <div className="text-sm text-foreground">
                      <span className="font-semibold">{TYPE_LABELS[blk.type]},</span>
                      {" "}{blk.repeatCount} × ({fmtDur(blk.durationSeconds)}
                      {blk.targetPace && <span style={{ color: zoneColor }}> {blk.targetPace}/km</span>}
                      {blk.restSeconds && blk.restSeconds > 0 && (
                        <span className="text-muted-foreground">, hvile: {fmtDur(blk.restSeconds)}{blk.restPace && ` ${blk.restPace}/km`}</span>
                      )}
                      ) <span className="text-[11px] text-muted-foreground">= {fmtDur(totalBlockSec)}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-foreground">
                      <span className="font-semibold">{TYPE_LABELS[blk.type] ?? blk.type},</span>
                      {" "}{fmtDur(totalBlockSec)}
                      {blk.targetPace && <span style={{ color: zoneColor }}> {blk.targetPace}/km</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Interval detail — clear work/rest breakdown */}
              {isInterval && (
                <div className="px-3 py-2.5 bg-muted/10 space-y-2.5">
                  {/* Visual: each rep as a numbered row with pace inside */}
                  <div className="space-y-1">
                    {Array.from({ length: blk.repeatCount! }).map((_, r) => (
                      <div key={r} className="flex items-center gap-2">
                        <span className="w-4 text-[9px] font-bold text-muted-foreground/40 text-right">{r + 1}</span>
                        <div className="flex-1 flex gap-1 h-6 items-center">
                          {/* Work segment — pace shown inside */}
                          <div
                            className="h-full rounded-sm flex items-center justify-between px-2 text-[9px] font-bold text-white/90"
                            style={{ flex: blk.durationSeconds, backgroundColor: zoneColor }}
                          >
                            <span>{fmtDur(blk.durationSeconds)}</span>
                            {blk.targetPace && <span className="text-white/70">{blk.targetPace}/km</span>}
                          </div>
                          {/* Rest segment — rest pace inside */}
                          {blk.restSeconds && blk.restSeconds > 0 && (
                            <div
                              className="h-full rounded-sm flex items-center justify-between px-2 text-[9px] text-muted-foreground/60 bg-muted/30"
                              style={{ flex: blk.restSeconds }}
                            >
                              <span>{fmtDur(blk.restSeconds)}</span>
                              {blk.restPace && <span>{blk.restPace}/km</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* (pace now shown in header) */}

              {blk.description && (
                <div className="px-3 py-1 bg-muted/5 text-[10px] text-muted-foreground/50 italic">{blk.description}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Summary with TSS + distance + zone distribution ──────── */}
      <div className="rounded-lg border border-border/30 bg-muted/10 p-3">
        {/* Top stats row */}
        <div className="flex items-center gap-4 mb-3 text-xs">
          <div>
            <span className="text-muted-foreground">Varighed: </span>
            <span className="font-bold text-foreground">{fmtDur(totalDuration)}</span>
          </div>
          {(() => {
            const totalKm = calcBlocksDistance(blocks);
            return totalKm > 0 ? (
              <div>
                <span className="text-muted-foreground">Distance: </span>
                <span className="font-bold text-foreground">~{totalKm.toFixed(1)} km</span>
              </div>
            ) : null;
          })()}
          <div>
            <span className="text-muted-foreground">Est. TSS: </span>
            <span className="font-bold text-foreground">{Math.round(calcBlocksTss(blocks, sport, thresholdPaceSec))}</span>
          </div>
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Zone-fordeling</div>
        {/* Stacked bar */}
        <div className="flex h-3 w-full overflow-hidden rounded-full mb-2">
          {Object.entries(zoneTime).sort(([a], [b]) => Number(a) - Number(b)).map(([z, secs]) => (
            <div key={z} style={{ width: `${(secs / totalDuration) * 100}%`, backgroundColor: ZONE_COLORS[Number(z)] }} />
          ))}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(zoneTime).sort(([a], [b]) => Number(a) - Number(b)).map(([z, secs]) => (
            <div key={z} className="flex items-center gap-1.5 text-[10px]">
              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ZONE_COLORS[Number(z)] }} />
              <span className="font-medium text-foreground">Z{z}</span>
              <span className="text-muted-foreground">{fmtDur(secs)} ({Math.round((secs / totalDuration) * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
