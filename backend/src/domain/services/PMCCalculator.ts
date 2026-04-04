import { PMCValues } from "../value-objects/PMCValues.js";

interface DailyTSSEntry {
  date: string;
  tss: number;
}

interface PMCDataPoint {
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
  monotony: number | null;
  strain: number | null;
  rampRate: number | null;
}

/**
 * PMC Calculator - Beregner Performance Management Chart vaerdier
 * med eksponentiel forfald (exponential decay)
 */
export class PMCCalculator {
  private ctlDays: number;
  private atlDays: number;

  constructor(ctlDays: number = 42, atlDays: number = 7) {
    this.ctlDays = ctlDays;
    this.atlDays = atlDays;
  }

  /**
   * Beregner komplet PMC tidsserie fra daglige TSS vaerdier
   * Bruger eksponentiel forfald: EMA_i = EMA_(i-1) * (1 - 2/(N+1)) + TSS_i * (2/(N+1))
   */
  calculate(dailyTSS: DailyTSSEntry[], initialCTL: number = 0, initialATL: number = 0): PMCDataPoint[] {
    if (dailyTSS.length === 0) return [];

    const sorted = [...dailyTSS].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const ctlDecay = Math.exp(-1 / this.ctlDays);
    const atlDecay = Math.exp(-1 / this.atlDays);

    let ctl = initialCTL;
    let atl = initialATL;

    const results: PMCDataPoint[] = [];
    const recentTSS: number[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const tss = entry.tss;

      // Eksponentiel forfald
      ctl = ctl * ctlDecay + tss * (1 - ctlDecay);
      atl = atl * atlDecay + tss * (1 - atlDecay);
      const tsb = ctl - atl;

      // Vedligehold sliding window paa 7 dage for monotoni/strain
      recentTSS.push(tss);
      if (recentTSS.length > 7) {
        recentTSS.shift();
      }

      let monotony: number | null = null;
      let strain: number | null = null;
      if (recentTSS.length === 7) {
        monotony = PMCValues.calculateMonotony(recentTSS);
        strain = PMCValues.calculateStrain(recentTSS);
      }

      // Ramp rate: CTL aendring over seneste 7 dage
      let rampRate: number | null = null;
      if (i >= 7) {
        const prevCTL = results[i - 7].ctl;
        rampRate = PMCValues.calculateRampRate(ctl, prevCTL);
      }

      results.push({
        date: entry.date,
        tss: Math.round(tss * 100) / 100,
        ctl: Math.round(ctl * 100) / 100,
        atl: Math.round(atl * 100) / 100,
        tsb: Math.round(tsb * 100) / 100,
        monotony,
        strain,
        rampRate,
      });
    }

    return results;
  }

  /**
   * Beregner en enkelt dags PMC vaerdier
   */
  calculateSingleDay(
    todayTSS: number,
    previousCTL: number,
    previousATL: number
  ): PMCValues {
    const ctlDecay = Math.exp(-1 / this.ctlDays);
    const atlDecay = Math.exp(-1 / this.atlDays);

    const newCTL = previousCTL * ctlDecay + todayTSS * (1 - ctlDecay);
    const newATL = previousATL * atlDecay + todayTSS * (1 - atlDecay);

    return new PMCValues(newCTL, newATL);
  }

  /**
   * Fylder huller i TSS data med 0 for dage uden traening
   */
  fillMissingDays(entries: DailyTSSEntry[]): DailyTSSEntry[] {
    if (entries.length === 0) return [];

    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const filled: DailyTSSEntry[] = [];
    const start = new Date(sorted[0].date);
    const end = new Date(sorted[sorted.length - 1].date);

    const tssMap = new Map<string, number>();
    for (const entry of sorted) {
      const key = entry.date.slice(0, 10);
      tssMap.set(key, (tssMap.get(key) || 0) + entry.tss);
    }

    const current = new Date(start);
    while (current <= end) {
      const key = current.toISOString().slice(0, 10);
      filled.push({
        date: key,
        tss: tssMap.get(key) || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return filled;
  }

  /**
   * Projekterer fremtidig CTL baseret paa planlagt ugentlig TSS
   */
  projectCTL(
    currentCTL: number,
    currentATL: number,
    plannedWeeklyTSS: number,
    weeks: number
  ): PMCDataPoint[] {
    const dailyTSS = plannedWeeklyTSS / 7;
    const days = weeks * 7;
    const entries: DailyTSSEntry[] = [];

    const today = new Date();
    for (let i = 1; i <= days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      entries.push({
        date: date.toISOString().slice(0, 10),
        tss: dailyTSS,
      });
    }

    return this.calculate(entries, currentCTL, currentATL);
  }
}
