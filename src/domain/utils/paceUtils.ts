/**
 * Central pace parsing and formatting.
 * Single source of truth — all M:SS ↔ seconds conversions go through here.
 */

/** Parse "4:15" → 255 seconds. Returns null on invalid input. */
export function parseMssToPaceSec(mss: string | number | null | undefined): number | null {
  if (mss == null) return null;
  if (typeof mss === "number") return mss > 0 ? mss : null;
  const str = String(mss).trim();
  if (!str) return null;
  const match = str.match(/^(\d+):(\d{1,2})$/);
  if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
  const num = Number(str);
  return !isNaN(num) && num > 0 ? num : null;
}

/** Format 255 → "4:15". Returns "" on null/zero. */
export function paceSecToMss(secs: number | null | undefined): string {
  if (secs == null || secs <= 0) return "";
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
