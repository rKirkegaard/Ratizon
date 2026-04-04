/**
 * Formaterer varighed fra sekunder til HH:MM:SS eller MM:SS
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Formaterer distance fra meter til km med decimaler
 */
export function formatDistance(meters: number, decimals: number = 1): string {
  const km = meters / 1000;
  return `${km.toFixed(decimals)} km`;
}

/**
 * Formaterer pace fra sekunder per km til M:SS/km
 */
export function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

/**
 * Konverterer pace (sekunder per km) til min:sek format
 */
export function paceToMinKm(secondsPerKm: number): { minutes: number; seconds: number } {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return { minutes, seconds };
}

/**
 * Formaterer watt med enhed
 */
export function formatPower(watts: number): string {
  return `${Math.round(watts)} W`;
}

/**
 * Formaterer hjertefrekvens
 */
export function formatHeartRate(bpm: number): string {
  return `${Math.round(bpm)} bpm`;
}

/**
 * Formaterer tal med tusinde-separator (dansk format)
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString("da-DK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
