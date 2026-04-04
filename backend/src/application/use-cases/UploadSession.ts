import { db } from "../../infrastructure/database/connection.js";
import {
  sessions,
  sessionTrackpoints,
  sessionLaps,
} from "../../infrastructure/database/schema/training.schema.js";
import { parseFIT } from "../../infrastructure/parsers/FITParser.js";
import { parseTCX } from "../../infrastructure/parsers/TCXParser.js";
import type { ParsedFile } from "../../infrastructure/parsers/FITParser.js";

export type FileFormat = "fit" | "tcx";

/**
 * Detect file format from buffer magic bytes or filename extension.
 */
export function detectFormat(buffer: Buffer, filename?: string): FileFormat {
  // FIT files start with header size byte, then ".FIT" signature at offset 8
  if (buffer.length >= 12) {
    const sig = buffer.slice(8, 12).toString("ascii");
    if (sig === ".FIT") return "fit";
  }

  // Check XML header for TCX
  const head = buffer.slice(0, 200).toString("utf-8").toLowerCase();
  if (head.includes("trainingcenterdatabase") || head.includes(".tcx")) return "tcx";

  // Fallback to extension
  if (filename) {
    const ext = filename.toLowerCase().split(".").pop();
    if (ext === "fit") return "fit";
    if (ext === "tcx") return "tcx";
  }

  // Default to FIT
  return "fit";
}

/**
 * Parse file buffer into a structured ParsedFile.
 */
function parseFile(buffer: Buffer, format: FileFormat): ParsedFile {
  switch (format) {
    case "fit":
      return parseFIT(buffer);
    case "tcx":
      return parseTCX(buffer);
    default:
      throw new Error(`Ukendt filformat: ${format}`);
  }
}

/**
 * Upload and process a training session file.
 * Parses the file, inserts session + trackpoints + laps into the database.
 */
export async function uploadSession(
  fileBuffer: Buffer,
  athleteId: string,
  filename?: string
): Promise<{ sessionId: string; sport: string; title: string }> {
  const format = detectFormat(fileBuffer, filename);
  const parsed = parseFile(fileBuffer, format);

  // Insert session
  const [createdSession] = await db
    .insert(sessions)
    .values({
      athleteId,
      sport: parsed.session.sport,
      sessionType: "training",
      title: parsed.session.title,
      startedAt: parsed.session.startTime,
      durationSeconds: parsed.session.durationSeconds,
      distanceMeters: parsed.session.distanceMeters,
      tss: parsed.session.trainingLoad,
      avgHr: parsed.session.avgHr,
      maxHr: parsed.session.maxHr,
      avgPower: parsed.session.avgPowerW,
      avgPace: parsed.session.avgPace,
      elevationGain: parsed.session.elevationGain,
      calories: parsed.session.calories,
      source: format,
    })
    .returning();

  const sessionId = createdSession.id;

  // Insert trackpoints in batches of 1000
  if (parsed.trackpoints.length > 0) {
    const BATCH_SIZE = 1000;
    for (let i = 0; i < parsed.trackpoints.length; i += BATCH_SIZE) {
      const batch = parsed.trackpoints.slice(i, i + BATCH_SIZE);
      await db.insert(sessionTrackpoints).values(
        batch.map((tp) => ({
          sessionId,
          timestamp: new Date(
            parsed.session.startTime.getTime() + tp.timestampOffsetS * 1000
          ),
          lat: tp.latitude,
          lng: tp.longitude,
          altitude: tp.altitudeM,
          hr: tp.heartRateBpm,
          power: tp.powerW,
          cadence: tp.cadenceRpm,
          speed: tp.speedMps,
          distance: tp.distance,
        }))
      );
    }
  }

  // Insert laps
  if (parsed.laps.length > 0) {
    await db.insert(sessionLaps).values(
      parsed.laps.map((lap) => ({
        sessionId,
        lapNumber: lap.lapNumber,
        startTime: lap.startTime,
        durationSeconds: lap.durationSeconds,
        distanceMeters: lap.distanceMeters,
        avgHr: lap.avgHr,
        maxHr: lap.maxHr,
        avgPower: lap.avgPower,
        avgPace: lap.avgPace,
        avgCadence: lap.avgCadence,
      }))
    );
  }

  return {
    sessionId: sessionId.toString(),
    sport: parsed.session.sport,
    title: parsed.session.title,
  };
}
