import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { useBrickTransition } from "@/application/hooks/training/useBricks";
import { SportIcon } from "@/presentation/components/shared/SportIcon";
import type { SessionBrick } from "@/domain/types/brick.types";

interface BrickDetailProps {
  athleteId: string;
  brick: SessionBrick;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}t ${m}m`;
  return `${m}m`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

function formatTransition(seconds: number | null): string {
  if (seconds == null) return "–";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function BrickDetail({ athleteId, brick }: BrickDetailProps) {
  const getSportColor = useAthleteStore((s) => s.getSportColor);
  const { data: transition } = useBrickTransition(athleteId, brick.id);

  return (
    <div data-testid="brick-detail" className="space-y-4 py-4">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Total tid: </span>
          <span className="font-semibold text-foreground">
            {formatDuration(brick.totalDurationSeconds)}
          </span>
        </div>
        {brick.totalDistanceMeters != null && brick.totalDistanceMeters > 0 && (
          <div>
            <span className="text-muted-foreground">Total distance: </span>
            <span className="font-semibold text-foreground">
              {formatDistance(brick.totalDistanceMeters)}
            </span>
          </div>
        )}
        {brick.totalTss != null && (
          <div>
            <span className="text-muted-foreground">Total TSS: </span>
            <span className="font-semibold text-foreground">{brick.totalTss}</span>
          </div>
        )}
      </div>

      {/* Segments timeline */}
      <div className="flex items-stretch gap-0">
        {brick.segments.map((seg, i) => {
          const color = getSportColor(seg.sport);
          const session = seg.session;
          const isLast = i === brick.segments.length - 1;

          return (
            <div key={seg.id} className="flex items-stretch">
              {/* Segment card */}
              <div
                data-testid={`brick-segment-${seg.segmentOrder}`}
                className="rounded-lg border border-border bg-card p-3 min-w-[140px]"
                style={{ borderLeftColor: color, borderLeftWidth: "3px" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <SportIcon sport={seg.sport} size={16} />
                  <span className="text-xs font-semibold text-foreground capitalize">
                    {seg.sport}
                  </span>
                </div>
                {session && (
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <p>{formatDuration(session.durationSeconds)}</p>
                    {session.distanceMeters && (
                      <p>{formatDistance(session.distanceMeters)}</p>
                    )}
                    {session.avgHr && <p>Gns. HR: {session.avgHr}</p>}
                    {session.tss != null && <p>TSS: {session.tss}</p>}
                  </div>
                )}
              </div>

              {/* Transition indicator */}
              {!isLast && (
                <div className="flex flex-col items-center justify-center px-2">
                  <div className="text-[10px] font-bold text-amber-400">
                    T{i + 1}
                  </div>
                  <div className="h-px w-8 bg-amber-400/50" />
                  <div className="text-[10px] text-muted-foreground">
                    {i === 0
                      ? formatTransition(brick.t1Seconds)
                      : formatTransition(brick.t2Seconds)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Run first 15 min analysis (for bike→run bricks) */}
      {transition && transition.runFirst15Min.length > 0 && (
        <div
          data-testid="brick-transition-chart"
          className="rounded-lg border border-border bg-card p-4"
        >
          <h4 className="mb-2 text-sm font-semibold text-foreground">
            Loeb — Foerste 15 min (HR vs Pace)
          </h4>
          <p className="mb-3 text-xs text-muted-foreground">
            Viser puls og hastighed i de kritiske foerste minutter efter overgang fra cykel til loeb.
          </p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={transition.runFirst15Min.map((p) => ({
                  min: Math.round(p.offsetSec / 60),
                  hr: p.hr,
                  paceMinKm:
                    p.speed && p.speed > 0
                      ? Math.round((1000 / p.speed / 60) * 100) / 100
                      : null,
                }))}
                margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="min"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v) => `${v}m`}
                />
                <YAxis
                  yAxisId="hr"
                  orientation="left"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  width={30}
                />
                <YAxis
                  yAxisId="pace"
                  orientation="right"
                  reversed
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  width={40}
                />
                <Tooltip cursor={false}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  yAxisId="hr"
                  dataKey="hr"
                  stroke="#EF4444"
                  strokeWidth={1.5}
                  dot={false}
                  name="Puls"
                />
                <Line
                  yAxisId="pace"
                  dataKey="paceMinKm"
                  stroke={getSportColor("run")}
                  strokeWidth={1.5}
                  dot={false}
                  name="Pace (min/km)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
