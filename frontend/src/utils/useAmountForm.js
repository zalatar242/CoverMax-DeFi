import { useState } from 'react';
import { parseUnits, formatUnits } from 'viem';

export const useAmountForm = (maxAmount = 0n, minDivisibleBy = 2, decimals = 6) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const validateAmount = (value) => {
    if (!value) return true; // Empty is valid (will be caught by disabled button)
    const numValue = parseFloat(value);
    return Number.isInteger(numValue * (10 ** decimals) / minDivisibleBy);
  };

  const handleMaxAmount = () => {
    if (!maxAmount) return;
    const formattedMax = Number(formatUnits(maxAmount, decimals));
    const roundedAmount = Math.floor(formattedMax / minDivisibleBy) * minDivisibleBy;
    setAmount(roundedAmount.toString());
  };

  const handleAmountChange = (value) => {
    try {
      setAmount(value);
      if (!value) {
        setError('');
        return;
      }

      const numValue = parseFloat(value);
      if (numValue < 0) {
        setError('Please enter a positive amount');
      } else if (!validateAmount(value)) {
        setError('Amount must be even to ensure equal distribution between AAA and AA tranches');
      } else {
        const valueInWei = parseUnits(value, decimals);
        if (maxAmount !== 0n && valueInWei > maxAmount) {
          setError('Amount exceeds your available balance');
        } else {
          setError('');
        }
      }
    } catch (err) {
      if (err.message.includes('256-bit')) {
        setError('Amount is too large');
      } else {
        setError('Invalid amount');
      }
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
    amountInWei: amount ? parseUnits(amount, decimals) : 0n
  };
};
