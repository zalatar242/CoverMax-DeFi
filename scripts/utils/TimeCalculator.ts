/**
 * Utility class for calculating insurance time periods
 */
export class TimeCalculator {
  /**
   * Calculate time periods for insurance deployment
   */
  static calculateTimePeriods(baseTime: number = Math.floor(Date.now() / 1000)) {
    return {
      S: baseTime + 2 * 24 * 60 * 60,   // 2 days - Issuance end
      T1: baseTime + 7 * 24 * 60 * 60,  // 7 days - Insurance end
      T2: baseTime + 8 * 24 * 60 * 60,  // 8 days - AAA claims start
      T3: baseTime + 9 * 24 * 60 * 60   // 9 days - Final claims end
    };
  }

  /**
   * Get human-readable time descriptions
   */
  static getTimeDescriptions() {
    return {
      S: "Issuance Period End (2 days)",
      T1: "Insurance Period End (7 days)", 
      T2: "AAA Claims Start (8 days)",
      T3: "Final Claims End (9 days)"
    };
  }
}