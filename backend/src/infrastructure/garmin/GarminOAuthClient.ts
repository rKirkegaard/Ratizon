import crypto from "crypto";

/**
 * Garmin Connect OAuth 1.0a client.
 *
 * Handles the three-legged OAuth dance and API calls to Garmin.
 * Garmin uses OAuth 1.0a — NOT OAuth 2.0.
 *
 * Endpoints:
 *  - Request Token: POST https://connectapi.garmin.com/oauth-service/oauth/request_token
 *  - Authorize:     https://connect.garmin.com/oauthConfirm?oauth_token=...
 *  - Access Token:  POST https://connectapi.garmin.com/oauth-service/oauth/access_token
 *  - Activities:    GET  https://apis.garmin.com/wellness-api/rest/activities
 *  - Activity File: GET  https://apis.garmin.com/wellness-api/rest/activityFile
 */

const GARMIN_REQUEST_TOKEN_URL =
  "https://connectapi.garmin.com/oauth-service/oauth/request_token";
const GARMIN_AUTHORIZE_URL =
  "https://connect.garmin.com/oauthConfirm";
const GARMIN_ACCESS_TOKEN_URL =
  "https://connectapi.garmin.com/oauth-service/oauth/access_token";
const GARMIN_ACTIVITIES_URL =
  "https://apis.garmin.com/wellness-api/rest/activities";
const GARMIN_ACTIVITY_FILE_URL =
  "https://apis.garmin.com/wellness-api/rest/activityFile";

// ── OAuth 1.0a signature helpers ────────────────────────────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

function generateTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

function buildBaseString(
  method: string,
  url: string,
  params: Record<string, string>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&");

  return `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(sortedParams)}`;
}

function sign(
  baseString: string,
  consumerSecret: string,
  tokenSecret = ""
): string {
  const key = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return crypto
    .createHmac("sha1", key)
    .update(baseString)
    .digest("base64");
}

function buildAuthHeader(params: Record<string, string>): string {
  const entries = Object.entries(params)
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(", ");
  return `OAuth ${entries}`;
}

// ── Main client ────────────────────────────────────────────────────────

export interface GarminConfig {
  consumerKey: string;
  consumerSecret: string;
  callbackUrl: string;
}

export interface GarminTokenPair {
  oauthToken: string;
  oauthTokenSecret: string;
}

export interface GarminActivitySummary {
  activityId: string;
  sport: string;
  startTime: string;
  durationSeconds: number;
  distanceMeters: number;
  activityName: string;
}

export function createGarminClient(config: GarminConfig) {
  const { consumerKey, consumerSecret, callbackUrl } = config;

  /**
   * Step 1: Get a request token from Garmin
   */
  async function getRequestToken(): Promise<GarminTokenPair> {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: generateNonce(),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: generateTimestamp(),
      oauth_callback: callbackUrl,
      oauth_version: "1.0",
    };

    const baseString = buildBaseString("POST", GARMIN_REQUEST_TOKEN_URL, oauthParams);
    oauthParams.oauth_signature = sign(baseString, consumerSecret);

    const response = await fetch(GARMIN_REQUEST_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: buildAuthHeader(oauthParams),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Garmin request token failed: ${response.status} ${text}`);
    }

    const body = await response.text();
    const params = new URLSearchParams(body);
    const oauthToken = params.get("oauth_token");
    const oauthTokenSecret = params.get("oauth_token_secret");

    if (!oauthToken || !oauthTokenSecret) {
      throw new Error("Missing oauth_token or oauth_token_secret in response");
    }

    return { oauthToken, oauthTokenSecret };
  }

  /**
   * Step 2: Build the authorization URL to redirect user to Garmin SSO
   */
  function getAuthorizationUrl(requestToken: string): string {
    return `${GARMIN_AUTHORIZE_URL}?oauth_token=${encodeURIComponent(requestToken)}`;
  }

  /**
   * Step 3: Exchange verifier for access token
   */
  async function getAccessToken(
    requestToken: string,
    requestTokenSecret: string,
    oauthVerifier: string
  ): Promise<GarminTokenPair & { garminUserId?: string }> {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: generateNonce(),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: generateTimestamp(),
      oauth_token: requestToken,
      oauth_verifier: oauthVerifier,
      oauth_version: "1.0",
    };

    const baseString = buildBaseString("POST", GARMIN_ACCESS_TOKEN_URL, oauthParams);
    oauthParams.oauth_signature = sign(baseString, consumerSecret, requestTokenSecret);

    const response = await fetch(GARMIN_ACCESS_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: buildAuthHeader(oauthParams),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Garmin access token failed: ${response.status} ${text}`);
    }

    const body = await response.text();
    const params = new URLSearchParams(body);

    return {
      oauthToken: params.get("oauth_token") || "",
      oauthTokenSecret: params.get("oauth_token_secret") || "",
      garminUserId: params.get("encoded_user_id") || undefined,
    };
  }

  /**
   * Make a signed GET request to the Garmin API
   */
  async function signedGet(
    url: string,
    accessToken: string,
    accessTokenSecret: string,
    queryParams: Record<string, string> = {}
  ): Promise<Response> {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: generateNonce(),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: generateTimestamp(),
      oauth_token: accessToken,
      oauth_version: "1.0",
    };

    const allParams = { ...oauthParams, ...queryParams };
    const baseString = buildBaseString("GET", url, allParams);
    oauthParams.oauth_signature = sign(baseString, consumerSecret, accessTokenSecret);

    const qs = new URLSearchParams(queryParams).toString();
    const fullUrl = qs ? `${url}?${qs}` : url;

    return fetch(fullUrl, {
      headers: { Authorization: buildAuthHeader(oauthParams) },
    });
  }

  /**
   * Fetch recent activities from Garmin
   */
  async function fetchRecentActivities(
    accessToken: string,
    accessTokenSecret: string,
    since: Date
  ): Promise<GarminActivitySummary[]> {
    const uploadStartTimeInSeconds = Math.floor(since.getTime() / 1000).toString();
    const uploadEndTimeInSeconds = Math.floor(Date.now() / 1000).toString();

    const response = await signedGet(
      GARMIN_ACTIVITIES_URL,
      accessToken,
      accessTokenSecret,
      { uploadStartTimeInSeconds, uploadEndTimeInSeconds }
    );

    if (!response.ok) {
      throw new Error(`Garmin activities fetch failed: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((a: any) => ({
      activityId: String(a.activityId || a.summaryId),
      sport: a.activityType || a.sportType || "other",
      startTime: a.startTimeInSeconds
        ? new Date(a.startTimeInSeconds * 1000).toISOString()
        : "",
      durationSeconds: a.durationInSeconds || 0,
      distanceMeters: a.distanceInMeters || 0,
      activityName: a.activityName || "",
    }));
  }

  /**
   * Download FIT file for a specific activity
   */
  async function fetchActivityFile(
    activityId: string,
    accessToken: string,
    accessTokenSecret: string
  ): Promise<Buffer> {
    const response = await signedGet(
      GARMIN_ACTIVITY_FILE_URL,
      accessToken,
      accessTokenSecret,
      { id: activityId }
    );

    if (!response.ok) {
      throw new Error(`Garmin activity file download failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  return {
    getRequestToken,
    getAuthorizationUrl,
    getAccessToken,
    fetchRecentActivities,
    fetchActivityFile,
  };
}

// ── Singleton with env config ──────────────────────────────────────────

let _client: ReturnType<typeof createGarminClient> | null = null;

export function getGarminClient(): ReturnType<typeof createGarminClient> | null {
  if (_client) return _client;

  const consumerKey = process.env.GARMIN_CONSUMER_KEY;
  const consumerSecret = process.env.GARMIN_CONSUMER_SECRET;
  const callbackUrl =
    process.env.GARMIN_CALLBACK_URL || "http://localhost:3002/api/garmin/callback";

  if (!consumerKey || !consumerSecret) {
    return null; // Garmin not configured
  }

  _client = createGarminClient({ consumerKey, consumerSecret, callbackUrl });
  return _client;
}
