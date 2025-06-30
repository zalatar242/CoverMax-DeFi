import { formatUnits } from 'viem';

// Format helpers
export const formatCMX = (value: any) => {
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

export const formatUSDC = (value: any) => {
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

export const calculatePercentage = (value: any, total: any) => {
  if (!total || parseFloat(total as string) === 0) return "0%";
  return ((parseFloat(value as string) / parseFloat(total as string)) * 100).toFixed(2) + "%";
};

// Contract ABI fragments
export const ADAPTER_ABI = [
  'function getTotalValueLocked() view returns (uint256)'
];
