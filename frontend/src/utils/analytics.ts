import { formatUnits } from 'viem';

// Format helpers - simplified since all tokens use 18 decimals
export const formatCMX = (value: any) => {
  // Convert to number (all tokens now use 18 decimals)
  const numericValue = typeof value === 'bigint'
    ? Number(formatUnits(value, 18))
    : Number(value) || 0;

  // Always use 8 decimal places for small values to show micro-earnings
  // Switch to 2 decimals for values >= 0.01
  const useSmallFormat = numericValue < 0.01 && numericValue > 0;
  const decimals = useSmallFormat ? 8 : 2;

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(Math.max(0, numericValue));

  return `${formatted} CMX`;
};

export const formatUSDC = (value: any) => {
  // Convert to number (all tokens now use 18 decimals)
  const formattedValue = typeof value === 'bigint'
    ? Number(formatUnits(value, 18))
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
