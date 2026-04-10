/** Parse "4:15" → 255 seconds. Returns null on invalid. */
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
