import { useAthleteProfile } from "@/application/hooks/athlete/useAthleteProfile";
import { parseMssToPaceSec } from "@/domain/utils/paceUtils";
import { useAthleteStore } from "@/application/stores/athleteStore";
import { Heart, Zap, TrendingUp } from "lucide-react";

// IronCoach exact zone colors
const ZONE_COLORS = ["#3A7BFF", "#28CF59", "#F6D74A", "#F57C00", "#D32F2F"];
const ZONE_NAMES = ["Restitution", "Aerob", "Tempo", "Taerskel", "VO2max"];

interface TrainingZonesProps {
  athleteId: string | null;
}

function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TrainingZones({ athleteId }: TrainingZonesProps) {
  const { data: profileData } = useAthleteProfile(athleteId);
  const profile = profileData?.data ?? (profileData as any);

  const maxHr = profile?.maxHr;
  const restingHr = profile?.restingHr;
  const ftp = profile?.ftp;
  const runThresholdPace = parseMssToPaceSec(profile?.runThresholdPace);
  const swimCss = profile?.swimCss;

  // Karvonen HR zones: ((HRmax - HRrest) * %intensity) + HRrest
  const hrZones = maxHr && restingHr ? [
    { zone: 1, name: ZONE_NAMES[0], pctLow: 0.50, pctHigh: 0.60 },
    { zone: 2, name: ZONE_NAMES[1], pctLow: 0.60, pctHigh: 0.70 },
    { zone: 3, name: ZONE_NAMES[2], pctLow: 0.70, pctHigh: 0.80 },
    { zone: 4, name: ZONE_NAMES[3], pctLow: 0.80, pctHigh: 0.90 },
    { zone: 5, name: ZONE_NAMES[4], pctLow: 0.90, pctHigh: 1.00 },
  ].map((z) => ({
    ...z,
    low: Math.round((maxHr - restingHr) * z.pctLow + restingHr),
    high: Math.round((maxHr - restingHr) * z.pctHigh + restingHr),
  })) : null;

  // Power zones from FTP
  const powerZones = ftp ? [
    { zone: 1, name: ZONE_NAMES[0], low: 0, high: Math.round(ftp * 0.55) },
    { zone: 2, name: ZONE_NAMES[1], low: Math.round(ftp * 0.55), high: Math.round(ftp * 0.75) },
    { zone: 3, name: ZONE_NAMES[2], low: Math.round(ftp * 0.75), high: Math.round(ftp * 0.90) },
    { zone: 4, name: ZONE_NAMES[3], low: Math.round(ftp * 0.90), high: Math.round(ftp * 1.05) },
    { zone: 5, name: ZONE_NAMES[4], low: Math.round(ftp * 1.05), high: Math.round(ftp * 1.50) },
  ] : null;

  // Pace zones from run threshold pace
  const paceZones = runThresholdPace ? [
    { zone: 1, name: ZONE_NAMES[0], low: Math.round(runThresholdPace * 1.29), high: Math.round(runThresholdPace * 1.14) },
    { zone: 2, name: ZONE_NAMES[1], low: Math.round(runThresholdPace * 1.14), high: Math.round(runThresholdPace * 1.06) },
    { zone: 3, name: ZONE_NAMES[2], low: Math.round(runThresholdPace * 1.06), high: Math.round(runThresholdPace * 1.01) },
    { zone: 4, name: ZONE_NAMES[3], low: Math.round(runThresholdPace * 1.01), high: Math.round(runThresholdPace * 0.97) },
    { zone: 5, name: ZONE_NAMES[4], low: Math.round(runThresholdPace * 0.97), high: Math.round(runThresholdPace * 0.85) },
  ] : null;

  if (!hrZones && !powerZones && !paceZones) {
    return (
      <div data-testid="training-zones" className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Traeningszoner</h3>
        <p className="text-xs text-muted-foreground">Udfyld baselines (HRmax, Hvile-HR, FTP, Loebetaerskel) i atletprofilen for at se auto-beregnede zoner.</p>
      </div>
    );
  }

  return (
    <div data-testid="training-zones" className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Traeningszoner (auto-beregnet)</h3>

      <div className="grid gap-4 md:grid-cols-3">
        {/* HR Zones */}
        {hrZones && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground">
              <Heart className="h-3.5 w-3.5 text-red-500" /> Pulszoner (Karvonen)
            </div>
            <div className="space-y-1">
              {hrZones.map((z) => (
                <div key={z.zone} className="flex items-center gap-2 rounded px-2 py-1" style={{ backgroundColor: `${ZONE_COLORS[z.zone - 1]}15` }}>
                  <span className="w-5 text-center text-[10px] font-bold text-white rounded px-1" style={{ backgroundColor: ZONE_COLORS[z.zone - 1] }}>Z{z.zone}</span>
                  <span className="flex-1 text-xs text-foreground">{z.name}</span>
                  <span className="text-xs font-medium text-foreground">{z.low}–{z.high} bpm</span>
                </div>
              ))}
            </div>
            <div className="mt-1 text-[9px] text-muted-foreground">HRmax: {maxHr} · Hvile: {restingHr}</div>
          </div>
        )}

        {/* Power Zones */}
        {powerZones && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-yellow-500" /> Effektzoner (FTP)
            </div>
            <div className="space-y-1">
              {powerZones.map((z) => (
                <div key={z.zone} className="flex items-center gap-2 rounded px-2 py-1" style={{ backgroundColor: `${ZONE_COLORS[z.zone - 1]}15` }}>
                  <span className="w-5 text-center text-[10px] font-bold text-white rounded px-1" style={{ backgroundColor: ZONE_COLORS[z.zone - 1] }}>Z{z.zone}</span>
                  <span className="flex-1 text-xs text-foreground">{z.name}</span>
                  <span className="text-xs font-medium text-foreground">{z.low}–{z.high}W</span>
                </div>
              ))}
            </div>
            <div className="mt-1 text-[9px] text-muted-foreground">FTP: {ftp}W</div>
          </div>
        )}

        {/* Pace Zones */}
        {paceZones && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" /> Pacezoner (Taerskel)
            </div>
            <div className="space-y-1">
              {paceZones.map((z) => (
                <div key={z.zone} className="flex items-center gap-2 rounded px-2 py-1" style={{ backgroundColor: `${ZONE_COLORS[z.zone - 1]}15` }}>
                  <span className="w-5 text-center text-[10px] font-bold text-white rounded px-1" style={{ backgroundColor: ZONE_COLORS[z.zone - 1] }}>Z{z.zone}</span>
                  <span className="flex-1 text-xs text-foreground">{z.name}</span>
                  <span className="text-xs font-medium text-foreground">{fmtPace(z.low)}–{fmtPace(z.high)}/km</span>
                </div>
              ))}
            </div>
            <div className="mt-1 text-[9px] text-muted-foreground">Taerskel: {fmtPace(runThresholdPace)}/km</div>
          </div>
        )}
      </div>
    </div>
  );
}
