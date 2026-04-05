import { Request, Response } from "express";
import { db } from "../../infrastructure/database/connection.js";
import { garminConnections, garminSyncLog } from "../../infrastructure/database/schema/garmin.schema.js";
import { sessions } from "../../infrastructure/database/schema/training.schema.js";
import { getGarminClient } from "../../infrastructure/garmin/GarminOAuthClient.js";
import { uploadSession } from "../use-cases/UploadSession.js";
import { eq, and, desc } from "drizzle-orm";

// ── Temporary store for OAuth request tokens (in-memory, 5 min TTL) ──
const pendingTokens = new Map<string, { secret: string; athleteId: string; expiresAt: number }>();

function cleanExpired() {
  const now = Date.now();
  for (const [key, val] of pendingTokens) {
    if (val.expiresAt < now) pendingTokens.delete(key);
  }
}

// ── GET /api/garmin/connect ───────────────────────────────────────────
export async function garminConnect(req: Request, res: Response) {
  try {
    const client = getGarminClient();
    if (!client) {
      res.status(503).json({ error: { message: "Garmin-integration er ikke konfigureret. Sæt GARMIN_CONSUMER_KEY og GARMIN_CONSUMER_SECRET." } });
      return;
    }

    const athleteId = req.user?.athleteId;
    if (!athleteId) {
      res.status(400).json({ error: { message: "Ingen atlet-ID fundet" } });
      return;
    }

    const { oauthToken, oauthTokenSecret } = await client.getRequestToken();

    // Store temporarily
    cleanExpired();
    pendingTokens.set(oauthToken, {
      secret: oauthTokenSecret,
      athleteId,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    const authUrl = client.getAuthorizationUrl(oauthToken);
    res.json({ data: { authUrl } });
  } catch (error: any) {
    console.error("Garmin connect error:", error);
    res.status(500).json({ error: { message: error.message || "Fejl ved Garmin-tilslutning" } });
  }
}

// ── GET /api/garmin/callback ──────────────────────────────────────────
export async function garminCallback(req: Request, res: Response) {
  try {
    const client = getGarminClient();
    if (!client) {
      res.status(503).json({ error: { message: "Garmin ikke konfigureret" } });
      return;
    }

    const oauthToken = req.query.oauth_token as string;
    const oauthVerifier = req.query.oauth_verifier as string;

    if (!oauthToken || !oauthVerifier) {
      res.status(400).json({ error: { message: "Manglende oauth_token eller oauth_verifier" } });
      return;
    }

    cleanExpired();
    const pending = pendingTokens.get(oauthToken);
    if (!pending) {
      res.status(400).json({ error: { message: "OAuth token udloebet eller ukendt" } });
      return;
    }
    pendingTokens.delete(oauthToken);

    const result = await client.getAccessToken(oauthToken, pending.secret, oauthVerifier);

    // Upsert garmin connection
    const [existing] = await db
      .select()
      .from(garminConnections)
      .where(eq(garminConnections.athleteId, pending.athleteId))
      .limit(1);

    if (existing) {
      await db
        .update(garminConnections)
        .set({
          oauthToken: result.oauthToken,
          oauthTokenSecret: result.oauthTokenSecret,
          garminUserId: result.garminUserId || existing.garminUserId,
          isActive: true,
          connectedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(garminConnections.id, existing.id));
    } else {
      await db.insert(garminConnections).values({
        athleteId: pending.athleteId,
        oauthToken: result.oauthToken,
        oauthTokenSecret: result.oauthTokenSecret,
        garminUserId: result.garminUserId || null,
        isActive: true,
      });
    }

    // Redirect to frontend settings page
    res.redirect("/indstillinger?garmin=connected");
  } catch (error: any) {
    console.error("Garmin callback error:", error);
    res.redirect("/indstillinger?garmin=error");
  }
}

// ── GET /api/garmin/status/:athleteId ─────────────────────────────────
export async function garminStatus(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;

    const [connection] = await db
      .select()
      .from(garminConnections)
      .where(and(eq(garminConnections.athleteId, athleteId), eq(garminConnections.isActive, true)))
      .limit(1);

    if (!connection) {
      res.json({
        data: {
          connected: false,
          garminUserId: null,
          connectedAt: null,
          lastSyncAt: null,
          recentSyncs: [],
        },
      });
      return;
    }

    const recentSyncs = await db
      .select()
      .from(garminSyncLog)
      .where(eq(garminSyncLog.connectionId, connection.id))
      .orderBy(desc(garminSyncLog.syncedAt))
      .limit(5);

    res.json({
      data: {
        connected: true,
        garminUserId: connection.garminUserId,
        connectedAt: connection.connectedAt.toISOString(),
        lastSyncAt: connection.lastSyncAt?.toISOString() || null,
        recentSyncs: recentSyncs.map((s) => ({
          syncType: s.syncType,
          activitiesReceived: s.activitiesReceived,
          activitiesImported: s.activitiesImported,
          errors: s.errors,
          syncedAt: s.syncedAt.toISOString(),
        })),
      },
    });
  } catch (error: any) {
    console.error("Garmin status error:", error);
    res.status(500).json({ error: { message: error.message || "Fejl ved hentning af Garmin-status" } });
  }
}

// ── POST /api/garmin/disconnect/:athleteId ────────────────────────────
export async function garminDisconnect(req: Request, res: Response) {
  try {
    const { athleteId } = req.params;

    await db
      .update(garminConnections)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(garminConnections.athleteId, athleteId));

    res.json({ data: { message: "Garmin-forbindelse afbrudt" } });
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message || "Fejl" } });
  }
}

// ── POST /api/garmin/sync/:athleteId ──────────────────────────────────
export async function garminSync(req: Request, res: Response) {
  try {
    const client = getGarminClient();
    if (!client) {
      res.status(503).json({ error: { message: "Garmin ikke konfigureret" } });
      return;
    }

    const { athleteId } = req.params;

    const [connection] = await db
      .select()
      .from(garminConnections)
      .where(and(eq(garminConnections.athleteId, athleteId), eq(garminConnections.isActive, true)))
      .limit(1);

    if (!connection) {
      res.status(404).json({ error: { message: "Ingen aktiv Garmin-forbindelse" } });
      return;
    }

    // Fetch activities from last sync or last 7 days
    const since = connection.lastSyncAt
      ? new Date(connection.lastSyncAt)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const activities = await client.fetchRecentActivities(
      connection.oauthToken,
      connection.oauthTokenSecret,
      since
    );

    let imported = 0;
    const errors: string[] = [];

    for (const activity of activities) {
      try {
        // Deduplication: check externalId
        const externalId = `garmin:${activity.activityId}`;
        const [existing] = await db
          .select({ id: sessions.id })
          .from(sessions)
          .where(eq(sessions.externalId, externalId))
          .limit(1);

        if (existing) continue;

        // Download FIT file
        const fitBuffer = await client.fetchActivityFile(
          activity.activityId,
          connection.oauthToken,
          connection.oauthTokenSecret
        );

        // Use existing upload pipeline
        await uploadSession(fitBuffer, athleteId, `garmin-${activity.activityId}.fit`, {
          source: "garmin",
          externalId,
        });
        imported++;
      } catch (err: any) {
        errors.push(`Activity ${activity.activityId}: ${err.message}`);
      }
    }

    // Update last sync time
    await db
      .update(garminConnections)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(garminConnections.id, connection.id));

    // Log sync
    await db.insert(garminSyncLog).values({
      connectionId: connection.id,
      syncType: "manual",
      activitiesReceived: activities.length,
      activitiesImported: imported,
      errors: errors.length > 0 ? errors.join("\n") : null,
    });

    res.json({
      data: {
        activitiesReceived: activities.length,
        activitiesImported: imported,
        errors: errors.length > 0 ? errors : null,
      },
    });
  } catch (error: any) {
    console.error("Garmin sync error:", error);
    res.status(500).json({ error: { message: error.message || "Fejl ved Garmin-synkronisering" } });
  }
}

// ── POST /api/garmin/webhook ──────────────────────────────────────────
export async function garminWebhook(req: Request, res: Response) {
  // Garmin push notification webhook
  // This is called by Garmin servers — no JWT auth
  // In production, verify webhook signature
  try {
    const activities = req.body?.activities || req.body?.activityFiles || [];

    if (!Array.isArray(activities) || activities.length === 0) {
      res.status(200).json({ message: "OK - no activities" });
      return;
    }

    // Process each activity asynchronously
    for (const activity of activities) {
      const garminUserId = activity.userId || activity.userAccessToken;
      const activityId = activity.activityId || activity.summaryId;

      if (!garminUserId || !activityId) continue;

      // Find connection by garmin user ID
      const [connection] = await db
        .select()
        .from(garminConnections)
        .where(
          and(
            eq(garminConnections.garminUserId, String(garminUserId)),
            eq(garminConnections.isActive, true)
          )
        )
        .limit(1);

      if (!connection) continue;

      const client = getGarminClient();
      if (!client) continue;

      const externalId = `garmin:${activityId}`;

      // Deduplication
      const [existing] = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(eq(sessions.externalId, externalId))
        .limit(1);

      if (existing) continue;

      try {
        const fitBuffer = await client.fetchActivityFile(
          String(activityId),
          connection.oauthToken,
          connection.oauthTokenSecret
        );

        await uploadSession(fitBuffer, connection.athleteId, `garmin-${activityId}.fit`, {
          source: "garmin",
          externalId,
        });

        await db.insert(garminSyncLog).values({
          connectionId: connection.id,
          syncType: "push",
          activitiesReceived: 1,
          activitiesImported: 1,
          errors: null,
        });
      } catch (err: any) {
        await db.insert(garminSyncLog).values({
          connectionId: connection.id,
          syncType: "push",
          activitiesReceived: 1,
          activitiesImported: 0,
          errors: err.message,
        });
      }
    }

    res.status(200).json({ message: "OK" });
  } catch (error: any) {
    console.error("Garmin webhook error:", error);
    res.status(200).json({ message: "OK" }); // Always return 200 to Garmin
  }
}
