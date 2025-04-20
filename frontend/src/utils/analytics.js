import { formatUnits } from 'viem';

// Format helpers
export const formatCMX = (value) => {
  const formattedValue = typeof value === 'bigint'
    ? Number(formatUnits(value, 6))
    : Number(value);

  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(formattedValue)} CMX`;
};

export const formatUSDC = (value) => {
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

export const calculatePercentage = (value, total) => {
  if (!total || parseFloat(total) === 0) return "0%";
  return ((parseFloat(value) / parseFloat(total)) * 100).toFixed(2) + "%";
};

// Contract ABI fragments
export const ADAPTER_ABI = [
  'function getTotalValueLocked() view returns (uint256)'
];
