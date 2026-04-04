import FitParser from "fit-file-parser";

export interface ParsedSession {
  sport: string;
  startTime: Date;
  durationSeconds: number;
  distanceMeters: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPowerW: number | null;
  avgPace: number | null;
  trainingLoad: number | null;
  elevationGain: number | null;
  calories: number | null;
  title: string;
}

export interface ParsedTrackpoint {
  timestampOffsetS: number;
  heartRateBpm: number | null;
  powerW: number | null;
  speedMps: number | null;
  cadenceRpm: number | null;
  altitudeM: number | null;
  latitude: number | null;
  longitude: number | null;
  distance: number | null;
}

export interface ParsedLap {
  lapNumber: number;
  durationSeconds: number;
  distanceMeters: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPower: number | null;
  avgCadence: number | null;
  avgPace: number | null;
  startTime: Date;
}

export interface ParsedFile {
  session: ParsedSession;
  trackpoints: ParsedTrackpoint[];
  laps: ParsedLap[];
}

// Map FIT sport enum to our sport keys
function mapSport(fitSport: string | undefined): string {
  if (!fitSport) return "other";
  const normalized = fitSport.toLowerCase();
  if (normalized.includes("run") || normalized.includes("running")) return "run";
  if (normalized.includes("cycl") || normalized.includes("bik")) return "bike";
  if (normalized.includes("swim")) return "swim";
  if (normalized.includes("strength") || normalized.includes("weight")) return "strength";
  return "other";
}

export function parseFIT(buffer: Buffer): ParsedFile {
  const fitParser = new FitParser({
    force: true,
    speedUnit: "m/s",
    lengthUnit: "m",
    temperatureUnit: "celsius",
    elapsedRecordField: true,
    mode: "list",
  });

  fitParser.parse(buffer);

  const data = fitParser as any;

  // Extract session summary
  const fitSession = data.sessions?.[0] ?? data.activity?.sessions?.[0] ?? {};
  const fitActivity = data.activity ?? {};

  const sport = mapSport(fitSession.sport ?? fitActivity.sport);
  const startTime = fitSession.start_time
    ? new Date(fitSession.start_time)
    : new Date();
  const durationSeconds = Math.round(
    fitSession.total_timer_time ?? fitSession.total_elapsed_time ?? 0
  );
  const distanceMeters = fitSession.total_distance
    ? Math.round(fitSession.total_distance)
    : null;
  const avgHr = fitSession.avg_heart_rate
    ? Math.round(fitSession.avg_heart_rate)
    : null;
  const maxHr = fitSession.max_heart_rate
    ? Math.round(fitSession.max_heart_rate)
    : null;
  const avgPowerW = fitSession.avg_power
    ? Math.round(fitSession.avg_power)
    : null;
  const elevationGain = fitSession.total_ascent
    ? Math.round(fitSession.total_ascent)
    : null;
  const calories = fitSession.total_calories
    ? Math.round(fitSession.total_calories)
    : null;
  const trainingLoad = fitSession.training_stress_score ?? null;

  // Calculate avg pace (min/km) for run/swim
  let avgPace: number | null = null;
  if (distanceMeters && durationSeconds && distanceMeters > 0) {
    if (sport === "swim") {
      // min per 100m
      avgPace = (durationSeconds / 60) / (distanceMeters / 100);
    } else if (sport === "run") {
      // min per km
      avgPace = (durationSeconds / 60) / (distanceMeters / 1000);
    }
  }

  const title =
    fitSession.session_name ??
    `${sport.charAt(0).toUpperCase() + sport.slice(1)} - ${startTime.toLocaleDateString("da-DK")}`;

  // Extract trackpoints (records)
  const records: any[] = data.records ?? [];
  const sessionStart = startTime.getTime();

  const trackpoints: ParsedTrackpoint[] = records.map((r: any) => {
    const ts = r.timestamp ? new Date(r.timestamp).getTime() : sessionStart;
    return {
      timestampOffsetS: Math.round((ts - sessionStart) / 1000),
      heartRateBpm: r.heart_rate != null ? Math.round(r.heart_rate) : null,
      powerW: r.power != null ? Math.round(r.power) : null,
      speedMps: r.speed ?? null,
      cadenceRpm: r.cadence != null ? Math.round(r.cadence) : null,
      altitudeM: r.altitude ?? r.enhanced_altitude ?? null,
      latitude: r.position_lat ?? null,
      longitude: r.position_long ?? null,
      distance: r.distance ?? null,
    };
  });

  // Extract laps
  const fitLaps: any[] = data.laps ?? [];
  const laps: ParsedLap[] = fitLaps.map((l: any, i: number) => {
    const lapDuration = Math.round(l.total_timer_time ?? l.total_elapsed_time ?? 0);
    const lapDistance = l.total_distance ? Math.round(l.total_distance) : null;
    let lapPace: number | null = null;
    if (lapDistance && lapDuration && lapDistance > 0) {
      if (sport === "swim") {
        lapPace = (lapDuration / 60) / (lapDistance / 100);
      } else if (sport === "run") {
        lapPace = (lapDuration / 60) / (lapDistance / 1000);
      }
    }

    return {
      lapNumber: i + 1,
      durationSeconds: lapDuration,
      distanceMeters: lapDistance,
      avgHr: l.avg_heart_rate ? Math.round(l.avg_heart_rate) : null,
      maxHr: l.max_heart_rate ? Math.round(l.max_heart_rate) : null,
      avgPower: l.avg_power ? Math.round(l.avg_power) : null,
      avgCadence: l.avg_cadence ? Math.round(l.avg_cadence) : null,
      avgPace: lapPace,
      startTime: l.start_time ? new Date(l.start_time) : startTime,
    };
  });

  return {
    session: {
      sport,
      startTime,
      durationSeconds,
      distanceMeters,
      avgHr,
      maxHr,
      avgPowerW,
      avgPace,
      trainingLoad,
      elevationGain,
      calories,
      title,
    },
    trackpoints,
    laps,
  };
}
