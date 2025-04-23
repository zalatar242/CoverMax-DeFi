interface RecoveryBreakdown {
  aaaRecovery: number;
  aaRecovery: number;
}

interface ChartDataPoint {
  x: number;
  recovery: number;
  aaaRecovery: number;
  aaRecovery: number;
  isProtocol1: boolean;
  isProtocol2: boolean;
}

/**
 * Calculate total recovery amount based on exploit severity
 * @param x - Severity of exploit (0-1)
 * @param aaaTokens - Amount of AAA tokens
 * @param aaTokens - Amount of AA tokens
 * @returns Total recovery amount in USDC
 */
export const calculateTotalRecovery = (
  x: number,
  aaaTokens: number,
  aaTokens: number
): number => {
  const aaaRecovery = Math.min(1, 2 * (1 - x)) * aaaTokens;
  const aaRecovery = Math.max(0, 1 - 2 * x) * aaTokens;
  return aaaRecovery + aaRecovery;
};

/**
 * Calculate individual token recovery amounts
 * @param x - Severity of exploit (0-1)
 * @param aaaTokens - Amount of AAA tokens
 * @param aaTokens - Amount of AA tokens
 * @returns Object containing recovery amounts for each token type
 */
export const calculateRecoveryBreakdown = (
  x: number,
  aaaTokens: number,
  aaTokens: number
): RecoveryBreakdown => {
  return {
    aaaRecovery: Math.min(1, 2 * (1 - x)) * aaaTokens,
    aaRecovery: Math.max(0, 1 - 2 * x) * aaTokens
  };
};

/**
 * Generate evenly spaced points between 0 and 1
 * @returns Array of numbers from 0 to 1 at 0.1 intervals
 */
export const generateXAxisTicks = (): number[] => {
  return Array.from({ length: 11 }, (_, i) => i / 10);
};

/**
 * Generate data points for the risk chart with high resolution and recovery breakdown
 * @param aaaTokens - Amount of AAA tokens
 * @param aaTokens - Amount of AA tokens
 * @returns Array of data points with detailed recovery information
 */
export const generateChartData = (
  aaaTokens: number,
  aaTokens: number
): ChartDataPoint[] => {
  const points: ChartDataPoint[] = [];
  // Use smaller step size for smoother curve but ensure we hit exact tick points
  const step = 0.01;

  for (let x = 0; x <= 1; x += step) {
    // Round to 2 decimal places to avoid floating point issues
    const xRounded = Math.round(x * 100) / 100;
    const breakdown = calculateRecoveryBreakdown(xRounded, aaaTokens, aaTokens);
    points.push({
      x: xRounded,
      recovery: breakdown.aaaRecovery + breakdown.aaRecovery,
      aaaRecovery: breakdown.aaaRecovery,
      aaRecovery: breakdown.aaRecovery,
      // Add threshold indicators
      isProtocol1: Math.abs(x - 0.5) < step / 2,
      isProtocol2: Math.abs(x - 1.0) < step / 2
    });
  }
  return points;
};
