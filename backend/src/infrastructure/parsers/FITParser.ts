import FitParser from "fit-file-parser";

export interface ParsedSession {
  sport: string;
  sessionType: string;
  startTime: Date;
  durationSeconds: number;
  distanceMeters: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPowerW: number | null;
  maxPowerW: number | null;
  normalizedPower: number | null;
  avgPace: number | null;     // s/km for run, s/100m for swim
  avgCadence: number | null;
  maxCadence: number | null;
  avgSpeed: number | null;    // m/s
  maxSpeed: number | null;    // m/s
  trainingLoad: number | null; // TSS from file
  intensityFactor: number | null;
  trainingEffect: number | null;
  elevationGain: number | null;
  elevationLoss: number | null;
  calories: number | null;
  avgTemperature: number | null;
  avgGroundContactTime: number | null;
  avgVerticalOscillation: number | null;
  avgVerticalRatio: number | null;
  avgStanceTime: number | null;
  swimStrokes: number | null;
  avgSwolf: number | null;
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
  temperature: number | null;
  groundContactTime: number | null;
  verticalOscillation: number | null;
  stanceTime: number | null;
}

export interface ParsedLap {
  lapNumber: number;
  durationSeconds: number;
  distanceMeters: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPower: number | null;
  maxPower: number | null;
  avgCadence: number | null;
  avgPace: number | null;
  avgSpeed: number | null;
  startTime: Date;
  calories: number | null;
  totalAscent: number | null;
  swimStroke: string | null;
  avgSwolf: number | null;
}

export interface ParsedFile {
  session: ParsedSession;
  trackpoints: ParsedTrackpoint[];
  laps: ParsedLap[];
}

function mapSport(fitSport: string | undefined): string {
  if (!fitSport) return "other";
  const n = fitSport.toLowerCase();
  if (n.includes("run") || n.includes("running")) return "run";
  if (n.includes("cycl") || n.includes("bik")) return "bike";
  if (n.includes("swim")) return "swim";
  if (n.includes("strength") || n.includes("weight") || n.includes("training")) return "strength";
  if (n.includes("walk") || n.includes("hik")) return "other";
  return "other";
}

function mapSessionType(fitType: string | undefined, sport: string): string {
  if (!fitType) return sport;
  const n = fitType.toLowerCase();
  if (n.includes("recovery") || n.includes("easy")) return "recovery";
  if (n.includes("interval") || n.includes("speed")) return "interval";
  if (n.includes("tempo")) return "tempo";
  if (n.includes("threshold") || n.includes("lactate")) return "threshold";
  if (n.includes("long") || n.includes("endurance")) return "endurance";
  if (n.includes("race") || n.includes("competition")) return "race";
  if (n.includes("warm")) return "recovery";
  return sport;
}

function round2(v: number | null | undefined): number | null {
  if (v == null || isNaN(v)) return null;
  return Math.round(v * 100) / 100;
}

function roundInt(v: number | null | undefined): number | null {
  if (v == null || isNaN(v)) return null;
  return Math.round(v);
}

/**
 * Calculate Normalized Power from trackpoint power data.
 * Uses 30-second rolling average, then 4th power average.
 */
function calculateNP(trackpoints: ParsedTrackpoint[]): number | null {
  const powers = trackpoints.map((t) => t.powerW).filter((p): p is number => p != null && p > 0);
  if (powers.length < 30) return null;

  // 30-second rolling average (assuming ~1 sec per record)
  const windowSize = 30;
  const rollingAvg: number[] = [];
  for (let i = windowSize - 1; i < powers.length; i++) {
    let sum = 0;
    for (let j = i - windowSize + 1; j <= i; j++) sum += powers[j];
    rollingAvg.push(sum / windowSize);
  }

  if (rollingAvg.length === 0) return null;

  // 4th power average
  const fourthPowerAvg = rollingAvg.reduce((s, p) => s + Math.pow(p, 4), 0) / rollingAvg.length;
  return Math.round(Math.pow(fourthPowerAvg, 0.25));
}

export async function parseFIT(buffer: Buffer): Promise<ParsedFile> {
  const fitParser = new FitParser({
    force: true,
    speedUnit: "m/s",
    lengthUnit: "m",
    temperatureUnit: "celsius",
    elapsedRecordField: true,
    mode: "list",
  });

  const data: any = await new Promise((resolve, reject) => {
    fitParser.parse(buffer, (error: any, parsed: any) => {
      if (error) reject(new Error("FIT parse fejl: " + error));
      else resolve(parsed);
    });
  });

  const fitSession = data.sessions?.[0] ?? data.activity?.sessions?.[0] ?? {};
  const fitActivity = data.activity ?? {};

  const sport = mapSport(fitSession.sport ?? fitActivity.sport);
  const sessionType = mapSessionType(fitSession.sub_sport ?? fitSession.name, sport);
  const startTime = fitSession.start_time ? new Date(fitSession.start_time) : new Date();
  const durationSeconds = Math.round(fitSession.total_timer_time ?? fitSession.total_elapsed_time ?? 0);
  const distanceMeters = roundInt(fitSession.total_distance);
  const avgHr = roundInt(fitSession.avg_heart_rate);
  const maxHr = roundInt(fitSession.max_heart_rate);
  const avgPowerW = roundInt(fitSession.avg_power);
  const maxPowerW = roundInt(fitSession.max_power);
  const avgSpeed = round2(fitSession.avg_speed ?? fitSession.enhanced_avg_speed);
  const maxSpeed = round2(fitSession.max_speed ?? fitSession.enhanced_max_speed);
  const avgCadence = roundInt(fitSession.avg_cadence ?? fitSession.avg_running_cadence);
  const maxCadence = roundInt(fitSession.max_cadence ?? fitSession.max_running_cadence);
  const elevationGain = roundInt(fitSession.total_ascent);
  const elevationLoss = roundInt(fitSession.total_descent);
  const calories = roundInt(fitSession.total_calories);
  const trainingLoad = round2(fitSession.training_stress_score);
  const intensityFactor = round2(fitSession.intensity_factor);
  const trainingEffect = round2(fitSession.total_training_effect);
  const avgTemperature = round2(fitSession.avg_temperature);

  // Running dynamics
  const avgGroundContactTime = round2(fitSession.avg_stance_time ?? fitSession.avg_ground_contact_time);
  const avgVerticalOscillation = round2(fitSession.avg_vertical_oscillation);
  const avgVerticalRatio = round2(fitSession.avg_vertical_ratio);
  const avgStanceTime = round2(fitSession.avg_stance_time_percent);

  // Swimming
  const swimStrokes = roundInt(fitSession.total_strokes ?? fitSession.num_active_lengths);
  const avgSwolf = round2(fitSession.avg_swolf);

  // Calculate avg pace
  let avgPace: number | null = null;
  if (distanceMeters && durationSeconds && distanceMeters > 0) {
    if (sport === "swim") {
      avgPace = round2((durationSeconds / (distanceMeters / 100))); // s/100m
    } else if (sport === "run") {
      avgPace = round2((durationSeconds / (distanceMeters / 1000))); // s/km
    }
  }

  const title =
    fitSession.session_name ??
    fitSession.name ??
    `${sessionType || sport} - ${startTime.toLocaleDateString("da-DK")}`;

  // Extract trackpoints
  const records: any[] = data.records ?? [];
  const sessionStart = startTime.getTime();

  const trackpoints: ParsedTrackpoint[] = records.map((r: any) => {
    const ts = r.timestamp ? new Date(r.timestamp).getTime() : sessionStart;
    return {
      timestampOffsetS: Math.round((ts - sessionStart) / 1000),
      heartRateBpm: roundInt(r.heart_rate),
      powerW: roundInt(r.power),
      speedMps: round2(r.speed ?? r.enhanced_speed),
      cadenceRpm: roundInt(r.cadence ?? r.fractional_cadence),
      altitudeM: round2(r.altitude ?? r.enhanced_altitude),
      latitude: r.position_lat ?? null,
      longitude: r.position_long ?? null,
      distance: round2(r.distance),
      temperature: round2(r.temperature),
      groundContactTime: round2(r.stance_time ?? r.ground_contact_time),
      verticalOscillation: round2(r.vertical_oscillation),
      stanceTime: round2(r.stance_time_percent),
    };
  });

  // Calculate NP from trackpoints if not in session
  const normalizedPower = roundInt(fitSession.normalized_power) ?? calculateNP(trackpoints);

  // Extract laps
  const fitLaps: any[] = data.laps ?? [];
  const laps: ParsedLap[] = fitLaps.map((l: any, i: number) => {
    const lapDuration = Math.round(l.total_timer_time ?? l.total_elapsed_time ?? 0);
    const lapDistance = roundInt(l.total_distance);
    let lapPace: number | null = null;
    if (lapDistance && lapDuration && lapDistance > 0) {
      if (sport === "swim") lapPace = round2(lapDuration / (lapDistance / 100));
      else if (sport === "run") lapPace = round2(lapDuration / (lapDistance / 1000));
    }

    return {
      lapNumber: i + 1,
      durationSeconds: lapDuration,
      distanceMeters: lapDistance,
      avgHr: roundInt(l.avg_heart_rate),
      maxHr: roundInt(l.max_heart_rate),
      avgPower: roundInt(l.avg_power),
      maxPower: roundInt(l.max_power),
      avgCadence: roundInt(l.avg_cadence ?? l.avg_running_cadence),
      avgPace: lapPace,
      avgSpeed: round2(l.avg_speed ?? l.enhanced_avg_speed),
      startTime: l.start_time ? new Date(l.start_time) : startTime,
      calories: roundInt(l.total_calories),
      totalAscent: roundInt(l.total_ascent),
      swimStroke: l.swim_stroke ?? null,
      avgSwolf: round2(l.avg_swolf),
    };
  });

  return {
    session: {
      sport,
      sessionType,
      startTime,
      durationSeconds,
      distanceMeters,
      avgHr,
      maxHr,
      avgPowerW,
      maxPowerW,
      normalizedPower,
      avgPace,
      avgCadence,
      maxCadence,
      avgSpeed,
      maxSpeed,
      trainingLoad,
      intensityFactor,
      trainingEffect,
      elevationGain,
      elevationLoss,
      calories,
      avgTemperature,
      avgGroundContactTime,
      avgVerticalOscillation,
      avgVerticalRatio,
      avgStanceTime,
      swimStrokes,
      avgSwolf,
      title,
    },
    trackpoints,
    laps,
  };
}
