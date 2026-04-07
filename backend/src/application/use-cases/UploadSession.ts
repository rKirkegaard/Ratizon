import { db } from "../../infrastructure/database/connection.js";
import {
  sessions,
  sessionTrackpoints,
  sessionLaps,
} from "../../infrastructure/database/schema/training.schema.js";
import { sessionAnalytics } from "../../infrastructure/database/schema/analytics.schema.js";
import { athletes } from "../../infrastructure/database/schema/athlete.schema.js";
import { eq } from "drizzle-orm";
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
async function parseFile(buffer: Buffer, format: FileFormat): Promise<ParsedFile> {
  switch (format) {
    case "fit":
      return await parseFIT(buffer);
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
  filename?: string,
  options?: { source?: string; externalId?: string }
): Promise<{ sessionId: string; sport: string; title: string }> {
  const format = detectFormat(fileBuffer, filename);
  const parsed = await parseFile(fileBuffer, format);

  // Insert session
  const [createdSession] = await db
    .insert(sessions)
    .values({
      athleteId,
      sport: parsed.session.sport,
      sessionType: parsed.session.sessionType || "training",
      title: parsed.session.title,
      startedAt: parsed.session.startTime,
      durationSeconds: parsed.session.durationSeconds,
      distanceMeters: parsed.session.distanceMeters,
      tss: parsed.session.trainingLoad,
      avgHr: parsed.session.avgHr,
      maxHr: parsed.session.maxHr,
      avgPower: parsed.session.avgPowerW,
      normalizedPower: parsed.session.normalizedPower,
      avgPace: parsed.session.avgPace,
      avgCadence: parsed.session.avgCadence,
      elevationGain: parsed.session.elevationGain,
      calories: parsed.session.calories,
      source: options?.source ?? format,
      externalId: options?.externalId ?? null,
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

  // ── Post-upload: calculate TSS and session_analytics ──────────────
  try {
    const avgHr = parsed.session.avgHr;
    const maxHr = parsed.session.maxHr;
    const avgPower = parsed.session.avgPowerW;
    const durationSec = parsed.session.durationSeconds;
    let tss = parsed.session.trainingLoad;

    // Get athlete baselines for TSS calculation
    const [athlete] = await db.select().from(athletes).where(eq(athletes.id, athleteId)).limit(1);
    const ftp = athlete?.ftp;
    const lthr = athlete?.lthr ?? (athlete?.maxHr ? Math.round(athlete.maxHr * 0.89) : null);

    // Calculate TSS if not from file
    // Power-TSS only for bike (FTP is cycling-specific). All others use HR-TSS.
    if (tss == null && durationSec > 0) {
      if (parsed.session.sport === "bike" && avgPower && ftp && ftp > 0) {
        const np = parsed.session.normalizedPower ?? avgPower;
        const intensityFactor = np / ftp;
        tss = Math.round((durationSec * np * intensityFactor) / (ftp * 36));
      } else if (avgHr && lthr && lthr > 0) {
        const hrRatio = avgHr / lthr;
        tss = Math.round((durationSec / 3600) * hrRatio * hrRatio * 100);
      }
    }

    // Update session TSS if calculated
    if (tss != null && parsed.session.trainingLoad == null) {
      await db.update(sessions).set({ tss }).where(eq(sessions.id, sessionId));
    }

    // Calculate zone distribution from trackpoints
    const hrZoneBounds = lthr
      ? [0, Math.round(lthr * 0.81), Math.round(lthr * 0.90), Math.round(lthr * 0.94), Math.round(lthr * 1.0), 999]
      : [0, 120, 140, 155, 170, 999];

    const zoneSec = [0, 0, 0, 0, 0];
    for (const tp of parsed.trackpoints) {
      if (tp.heartRateBpm && tp.heartRateBpm > 0) {
        for (let z = 4; z >= 0; z--) {
          if (tp.heartRateBpm >= hrZoneBounds[z]) {
            zoneSec[z]++;
            break;
          }
        }
      }
    }

    // Calculate EF and decoupling
    let ef: number | null = null;
    let decoupling: number | null = null;

    if (avgPower && avgHr && avgHr > 0) {
      ef = Math.round((avgPower / avgHr) * 100) / 100;
    } else if (parsed.session.distanceMeters && durationSec > 0 && avgHr && avgHr > 0) {
      const speedMs = parsed.session.distanceMeters / durationSec;
      ef = Math.round((speedMs / avgHr) * 10000) / 10000;
    }

    // Decoupling: compare first half vs second half HR/output ratio
    if (parsed.trackpoints.length > 20) {
      const mid = Math.floor(parsed.trackpoints.length / 2);
      const firstHalf = parsed.trackpoints.slice(0, mid);
      const secondHalf = parsed.trackpoints.slice(mid);

      const avgHr1 = firstHalf.filter(t => t.heartRateBpm).reduce((s, t) => s + (t.heartRateBpm ?? 0), 0) / (firstHalf.filter(t => t.heartRateBpm).length || 1);
      const avgHr2 = secondHalf.filter(t => t.heartRateBpm).reduce((s, t) => s + (t.heartRateBpm ?? 0), 0) / (secondHalf.filter(t => t.heartRateBpm).length || 1);

      if (avgPower) {
        const avgPwr1 = firstHalf.filter(t => t.powerW).reduce((s, t) => s + (t.powerW ?? 0), 0) / (firstHalf.filter(t => t.powerW).length || 1);
        const avgPwr2 = secondHalf.filter(t => t.powerW).reduce((s, t) => s + (t.powerW ?? 0), 0) / (secondHalf.filter(t => t.powerW).length || 1);
        const ef1 = avgHr1 > 0 ? avgPwr1 / avgHr1 : 0;
        const ef2 = avgHr2 > 0 ? avgPwr2 / avgHr2 : 0;
        if (ef1 > 0) decoupling = Math.round(((ef1 - ef2) / ef1) * 1000) / 10;
      } else if (avgHr1 > 0 && avgHr2 > 0) {
        decoupling = Math.round(((avgHr2 - avgHr1) / avgHr1) * 1000) / 10;
      }
    }

    // Insert session_analytics
    await db.insert(sessionAnalytics).values({
      sessionId,
      efficiencyFactor: ef,
      decoupling,
      intensityFactor: avgPower && ftp ? Math.round((avgPower / ftp) * 100) / 100 : null,
      zone1Seconds: zoneSec[0],
      zone2Seconds: zoneSec[1],
      zone3Seconds: zoneSec[2],
      zone4Seconds: zoneSec[3],
      zone5Seconds: zoneSec[4],
      trimp: avgHr && durationSec ? Math.round((durationSec / 60) * (avgHr / 180) * 100) / 100 : null,
      hrss: tss,
    }).catch(() => { /* ignore duplicate */ });

  } catch (analyticsErr) {
    console.error("Post-upload analytics fejl (non-fatal):", (analyticsErr as Error).message);
  }

  return {
    sessionId: sessionId.toString(),
    sport: parsed.session.sport,
    title: parsed.session.title,
  };
}
