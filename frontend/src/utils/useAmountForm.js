import { useState } from 'react';
import { parseUnits, formatUnits } from 'viem';

export const useAmountForm = (maxAmount = 0n, minDivisibleBy = 3) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const validateAmount = (value) => {
    if (!value) return true; // Empty is valid (will be caught by disabled button)
    const numValue = parseFloat(value);
    const decimalPlaces = 6; // USDC decimals
    return Number.isInteger(numValue * (10 ** decimalPlaces) / minDivisibleBy);
  };

  const handleMaxAmount = () => {
    if (!maxAmount) return;
    const formattedMax = Number(formatUnits(maxAmount, 6));
    const roundedAmount = Math.floor(formattedMax / minDivisibleBy) * minDivisibleBy;
    setAmount(roundedAmount.toString());
  };

  const handleAmountChange = (value) => {
    setAmount(value);
    if (value && !validateAmount(value)) {
      setError(`Amount must be divisible by ${minDivisibleBy}`);
    } else if (value && parseUnits(value, 6) > maxAmount) {
      setError('Amount exceeds balance');
    } else {
      setError('');
    }
  };

  const reset = () => {
    setAmount('');
    setError('');
  };

  return {
    amount,
    error,
    setError,
    handleAmountChange,
    handleMaxAmount,
    validateAmount,
    reset,
    amountInWei: amount ? parseUnits(amount, 6) : 0n
  };
};
