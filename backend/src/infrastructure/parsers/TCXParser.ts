import type { ParsedFile, ParsedSession, ParsedTrackpoint, ParsedLap } from "./FITParser.js";

/**
 * Simple TCX XML parser.
 * TCX files are XML-based training data from Garmin and other devices.
 */

function getTextContent(parent: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, "i");
  const match = parent.match(regex);
  return match ? match[1].trim() : null;
}

function getAllBlocks(xml: string, tagName: string): string[] {
  const results: string[] = [];
  const openTag = `<${tagName}`;
  const closeTag = `</${tagName}>`;
  let searchFrom = 0;

  while (true) {
    const start = xml.indexOf(openTag, searchFrom);
    if (start === -1) break;
    const end = xml.indexOf(closeTag, start);
    if (end === -1) break;
    results.push(xml.slice(start, end + closeTag.length));
    searchFrom = end + closeTag.length;
  }

  return results;
}

function detectSport(xml: string): string {
  const activityBlock = xml.match(/<Activity\s+Sport="([^"]+)"/i);
  if (!activityBlock) return "other";
  const sport = activityBlock[1].toLowerCase();
  if (sport.includes("run")) return "run";
  if (sport.includes("bik") || sport.includes("cycl")) return "bike";
  if (sport.includes("swim")) return "swim";
  return "other";
}

export function parseTCX(buffer: Buffer): ParsedFile {
  const xml = buffer.toString("utf-8");
  const sport = detectSport(xml);

  // Parse laps
  const lapBlocks = getAllBlocks(xml, "Lap");
  const laps: ParsedLap[] = [];
  const allTrackpoints: ParsedTrackpoint[] = [];

  let totalDuration = 0;
  let totalDistance = 0;
  let totalHrSum = 0;
  let totalHrCount = 0;
  let maxHr = 0;
  let totalCalories = 0;
  let firstStartTime: Date | null = null;

  lapBlocks.forEach((lapXml, i) => {
    // Lap start time
    const startTimeMatch = lapXml.match(/<Lap\s+StartTime="([^"]+)"/i);
    const lapStartTime = startTimeMatch ? new Date(startTimeMatch[1]) : new Date();
    if (i === 0) firstStartTime = lapStartTime;

    const lapDuration = parseFloat(getTextContent(lapXml, "TotalTimeSeconds") ?? "0");
    const lapDistance = parseFloat(getTextContent(lapXml, "DistanceMeters") ?? "0");
    const lapCalories = parseInt(getTextContent(lapXml, "Calories") ?? "0", 10);
    const lapAvgHrStr = getTextContent(lapXml, "AverageHeartRateBpm");
    const lapMaxHrStr = getTextContent(lapXml, "MaximumHeartRateBpm");

    // HR values are nested: <AverageHeartRateBpm><Value>X</Value></AverageHeartRateBpm>
    const avgHrBlock = lapXml.match(/<AverageHeartRateBpm[^>]*>[\s\S]*?<Value>(\d+)<\/Value>/i);
    const maxHrBlock = lapXml.match(/<MaximumHeartRateBpm[^>]*>[\s\S]*?<Value>(\d+)<\/Value>/i);
    const lapAvgHr = avgHrBlock ? parseInt(avgHrBlock[1], 10) : null;
    const lapMaxHr = maxHrBlock ? parseInt(maxHrBlock[1], 10) : null;

    totalDuration += lapDuration;
    totalDistance += lapDistance;
    totalCalories += lapCalories;
    if (lapAvgHr != null) {
      totalHrSum += lapAvgHr * lapDuration;
      totalHrCount += lapDuration;
    }
    if (lapMaxHr != null && lapMaxHr > maxHr) maxHr = lapMaxHr;

    let lapPace: number | null = null;
    if (lapDistance > 0 && lapDuration > 0) {
      if (sport === "swim") {
        lapPace = (lapDuration / 60) / (lapDistance / 100);
      } else if (sport === "run") {
        lapPace = (lapDuration / 60) / (lapDistance / 1000);
      }
    }

    laps.push({
      lapNumber: i + 1,
      durationSeconds: Math.round(lapDuration),
      distanceMeters: Math.round(lapDistance) || null,
      avgHr: lapAvgHr,
      maxHr: lapMaxHr,
      avgPower: null,
      avgCadence: null,
      avgPace: lapPace,
      startTime: lapStartTime,
    });

    // Parse trackpoints within this lap
    const tpBlocks = getAllBlocks(lapXml, "Trackpoint");
    const sessionStartMs = (firstStartTime ?? new Date()).getTime();

    tpBlocks.forEach((tpXml) => {
      const timeStr = getTextContent(tpXml, "Time");
      const ts = timeStr ? new Date(timeStr).getTime() : sessionStartMs;

      const hrMatch = tpXml.match(/<HeartRateBpm[^>]*>[\s\S]*?<Value>(\d+)<\/Value>/i);
      const posLatMatch = tpXml.match(/<LatitudeDegrees>([^<]+)<\/LatitudeDegrees>/i);
      const posLngMatch = tpXml.match(/<LongitudeDegrees>([^<]+)<\/LongitudeDegrees>/i);

      allTrackpoints.push({
        timestampOffsetS: Math.round((ts - sessionStartMs) / 1000),
        heartRateBpm: hrMatch ? parseInt(hrMatch[1], 10) : null,
        powerW: null, // TCX doesn't natively have power in standard format
        speedMps: null, // Speed needs to be derived from distance changes
        cadenceRpm: getTextContent(tpXml, "Cadence")
          ? parseInt(getTextContent(tpXml, "Cadence")!, 10)
          : null,
        altitudeM: getTextContent(tpXml, "AltitudeMeters")
          ? parseFloat(getTextContent(tpXml, "AltitudeMeters")!)
          : null,
        latitude: posLatMatch ? parseFloat(posLatMatch[1]) : null,
        longitude: posLngMatch ? parseFloat(posLngMatch[1]) : null,
        distance: getTextContent(tpXml, "DistanceMeters")
          ? parseFloat(getTextContent(tpXml, "DistanceMeters")!)
          : null,
      });
    });
  });

  // Calculate speed from consecutive trackpoints
  for (let i = 1; i < allTrackpoints.length; i++) {
    const prev = allTrackpoints[i - 1];
    const curr = allTrackpoints[i];
    const dt = curr.timestampOffsetS - prev.timestampOffsetS;
    if (dt > 0 && curr.distance != null && prev.distance != null) {
      const dd = curr.distance - prev.distance;
      if (dd >= 0) {
        curr.speedMps = dd / dt;
      }
    }
  }

  // Calculate elevation gain
  let elevationGain = 0;
  for (let i = 1; i < allTrackpoints.length; i++) {
    const prevAlt = allTrackpoints[i - 1].altitudeM;
    const currAlt = allTrackpoints[i].altitudeM;
    if (prevAlt != null && currAlt != null && currAlt > prevAlt) {
      elevationGain += currAlt - prevAlt;
    }
  }

  const startTime = firstStartTime ?? new Date();
  const avgHr = totalHrCount > 0 ? Math.round(totalHrSum / totalHrCount) : null;
  const roundedDistance = Math.round(totalDistance) || null;

  let avgPace: number | null = null;
  if (roundedDistance && totalDuration > 0) {
    if (sport === "swim") {
      avgPace = (totalDuration / 60) / (roundedDistance / 100);
    } else if (sport === "run") {
      avgPace = (totalDuration / 60) / (roundedDistance / 1000);
    }
  }

  const session: ParsedSession = {
    sport,
    startTime,
    durationSeconds: Math.round(totalDuration),
    distanceMeters: roundedDistance,
    avgHr,
    maxHr: maxHr > 0 ? maxHr : null,
    avgPowerW: null,
    avgPace,
    trainingLoad: null,
    elevationGain: Math.round(elevationGain) || null,
    calories: totalCalories || null,
    title: `${sport.charAt(0).toUpperCase() + sport.slice(1)} - ${startTime.toLocaleDateString("da-DK")}`,
  };

  return {
    session,
    trackpoints: allTrackpoints,
    laps,
  };
}
