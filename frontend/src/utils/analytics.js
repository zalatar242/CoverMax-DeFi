import { formatUnits } from 'viem';

// Format helpers that don't need updating
export const formatUSDC = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const calculatePercentage = (value, total) => {
  if (!total || parseFloat(total) === 0) return "0%";
  return ((parseFloat(value) / parseFloat(total)) * 100).toFixed(2) + "%";
};

// Contract ABI fragments
export const ADAPTER_ABI = [
  'function getTotalValueLocked() view returns (uint256)'
];
