/**
 * Nutrition Periodization Service (S26)
 * Calculates daily calorie targets, carb periodization, and session-specific fueling.
 */

export interface DailyNutritionTarget {
  date: string;
  bmr: number;
  activityCalories: number;
  totalCalories: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  fuelingIntent: "fasted" | "low_carb" | "full_fuel" | "race_fuel" | "rest";
  sessions: Array<{
    title: string;
    sport: string;
    durationMin: number;
    carbsPerHour: number;
    fuelingNote: string;
  }>;
}

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
export function calculateBMR(weightKg: number, heightCm: number, ageYears: number, isMale = true): number {
  if (isMale) {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5);
  }
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161);
}

/**
 * Estimate calories burned during a session
 */
export function estimateSessionCalories(sport: string, durationMin: number, weightKg: number, avgHr?: number): number {
  // MET-based estimation
  const mets: Record<string, number> = {
    swim: 8.0,
    bike: 7.5,
    run: 9.8,
    strength: 5.0,
  };

  const met = mets[sport] ?? 6.0;
  // Calories = MET × weight(kg) × duration(hours)
  return Math.round(met * weightKg * (durationMin / 60));
}

/**
 * Determine fueling intent based on session purpose
 */
export function determineFuelingIntent(sessionPurpose: string, sport: string, durationMin: number): "fasted" | "low_carb" | "full_fuel" | "race_fuel" {
  if (sessionPurpose === "recovery" && durationMin < 45) return "fasted";
  if (sessionPurpose === "endurance" && durationMin < 60) return "low_carb";
  if (sessionPurpose === "race" || sessionPurpose === "competition") return "race_fuel";
  if (durationMin > 90 || ["threshold", "vo2max", "interval"].includes(sessionPurpose)) return "full_fuel";
  return "low_carb";
}

/**
 * Calculate carbs per hour recommendation
 */
export function carbsPerHour(sport: string, durationMin: number, intensity: string): number {
  if (durationMin < 60) return 0;
  if (durationMin < 90 && intensity !== "race") return 30;
  if (sport === "bike") return intensity === "race" ? 90 : 60;
  if (sport === "run") return intensity === "race" ? 60 : 40;
  return 30;
}

/**
 * Generate race-week carb loading protocol
 */
export function generateCarbLoadingProtocol(weightKg: number, raceDayStr: string): Array<{ day: string; carbsGPerKg: number; totalCarbsG: number; note: string }> {
  const raceDay = new Date(raceDayStr);
  const protocol: Array<{ day: string; carbsGPerKg: number; totalCarbsG: number; note: string }> = [];

  for (let i = 3; i >= 0; i--) {
    const d = new Date(raceDay);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);

    let carbsPerKg: number;
    let note: string;

    if (i === 3) {
      carbsPerKg = 7;
      note = "Normal kost, oeg kulhydrater let";
    } else if (i === 2) {
      carbsPerKg = 8;
      note = "Hoej kulhydrat, reducer fiber";
    } else if (i === 1) {
      carbsPerKg = 10;
      note = "Maksimal carb-loading, kendte foedevarer";
    } else {
      carbsPerKg = 3;
      note = "Let morgenmad 2-3t foer start";
    }

    protocol.push({
      day: dayStr,
      carbsGPerKg: carbsPerKg,
      totalCarbsG: Math.round(carbsPerKg * weightKg),
      note,
    });
  }

  return protocol;
}
