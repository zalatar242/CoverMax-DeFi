import { formatUnits } from 'viem';

type ValueType = string | number | bigint;

/**
 * Format a number as CMX token amount
 * @param value - The value to format (can be bigint, number, or string)
 * @returns Formatted string with CMX suffix
 */
export const formatCMX = (value: ValueType): string => {
  // Ensure we're working with a number
  const numericValue = typeof value === 'bigint'
    ? Number(formatUnits(value, 6))
    : Number(value) || 0;

  // Always use 8 decimal places for small values to show micro-earnings
  // Switch to 2 decimals for values >= 0.01
  const useSmallFormat = numericValue < 0.01 && numericValue > 0;
  const decimals = useSmallFormat ? 8 : 2;

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(Math.max(0, numericValue)); // Ensure we don't show negative values

  return `${formatted} CMX`;
};

/**
 * Format a number as USDC currency amount
 * @param value - The value to format (can be bigint, number, or string)
 * @returns Formatted string with USD currency format
 */
export const formatUSDC = (value: ValueType): string => {
  // Convert bigint to string with proper decimals
  const formattedValue = typeof value === 'bigint'
    ? Number(formatUnits(value, 6))
    : Number(value);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(formattedValue);
};

/**
 * Calculate percentage from two values
 * @param value - Numerator value
 * @param total - Denominator value
 * @returns Formatted percentage string with % suffix
 */
export const calculatePercentage = (value: ValueType, total: ValueType): string => {
  if (!total || parseFloat(String(total)) === 0) return "0%";
  return ((parseFloat(String(value)) / parseFloat(String(total))) * 100).toFixed(2) + "%";
};

/**
 * Contract ABI fragments for adapters
 */
export const ADAPTER_ABI = [
  'function getTotalValueLocked() view returns (uint256)'
] as const;
