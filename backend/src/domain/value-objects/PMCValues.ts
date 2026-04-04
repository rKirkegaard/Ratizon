/**
 * Performance Management Chart (PMC) vaerdier
 *
 * CTL (Chronic Training Load) = Fitness - 42-dages eksponentiel glidende gennemsnit af daglig TSS
 * ATL (Acute Training Load) = Traethed - 7-dages eksponentiel glidende gennemsnit af daglig TSS
 * TSB (Training Stress Balance) = Form = CTL - ATL
 */

export class PMCValues {
  readonly ctl: number;
  readonly atl: number;
  readonly tsb: number;

  constructor(ctl: number, atl: number) {
    this.ctl = Math.round(ctl * 100) / 100;
    this.atl = Math.round(atl * 100) / 100;
    this.tsb = Math.round((ctl - atl) * 100) / 100;
  }

  /**
   * Beregner ny CTL baseret paa dagens TSS
   * CTL_i = CTL_(i-1) + (TSS_i - CTL_(i-1)) / ctlDays
   */
  static calculateCTL(previousCTL: number, todayTSS: number, ctlDays: number = 42): number {
    const decayFactor = 1 / ctlDays;
    return previousCTL + (todayTSS - previousCTL) * decayFactor;
  }

  /**
   * Beregner ny ATL baseret paa dagens TSS
   * ATL_i = ATL_(i-1) + (TSS_i - ATL_(i-1)) / atlDays
   */
  static calculateATL(previousATL: number, todayTSS: number, atlDays: number = 7): number {
    const decayFactor = 1 / atlDays;
    return previousATL + (todayTSS - previousATL) * decayFactor;
  }

  /**
   * Beregner TSB (Form)
   */
  static calculateTSB(ctl: number, atl: number): number {
    return ctl - atl;
  }

  /**
   * Beregner monotoni: gennemsnitlig daglig TSS / standardafvigelse over 7 dage
   */
  static calculateMonotony(weeklyTSSValues: number[]): number {
    if (weeklyTSSValues.length === 0) return 0;
    const mean = weeklyTSSValues.reduce((a, b) => a + b, 0) / weeklyTSSValues.length;
    const variance =
      weeklyTSSValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      weeklyTSSValues.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return Math.round((mean / stdDev) * 100) / 100;
  }

  /**
   * Beregner strain: ugentlig TSS * monotoni
   */
  static calculateStrain(weeklyTSSValues: number[]): number {
    const totalTSS = weeklyTSSValues.reduce((a, b) => a + b, 0);
    const monotony = PMCValues.calculateMonotony(weeklyTSSValues);
    return Math.round(totalTSS * monotony * 100) / 100;
  }

  /**
   * Beregner CTL ramp rate (CTL aendring pr. uge)
   */
  static calculateRampRate(currentCTL: number, previousWeekCTL: number): number {
    return Math.round((currentCTL - previousWeekCTL) * 100) / 100;
  }

  /**
   * Returnerer formstatus baseret paa TSB
   */
  getFormStatus(): "fresh" | "neutral" | "fatigued" | "overtrained" {
    if (this.tsb > 15) return "fresh";
    if (this.tsb >= -10) return "neutral";
    if (this.tsb >= -30) return "fatigued";
    return "overtrained";
  }

  /**
   * Returnerer risiko for overtraening
   */
  getOvertrainingRisk(): "low" | "moderate" | "high" {
    if (this.tsb < -30) return "high";
    if (this.tsb < -15) return "moderate";
    return "low";
  }
}
