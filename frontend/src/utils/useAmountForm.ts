import { useState } from 'react';
import { parseUnits, formatUnits } from 'viem';

interface UseAmountFormReturn {
  amount: string;
  error: string;
  setError: (error: string) => void;
  handleAmountChange: (value: string) => void;
  handleMaxAmount: () => void;
  validateAmount: (value: string) => boolean;
  reset: () => void;
  amountInWei: bigint;
}

export const useAmountForm = (maxAmount: bigint = 0n, minDivisibleBy: number = 2, decimals: number = 6): UseAmountFormReturn => {
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string>('');

  const validateAmount = (value: string): boolean => {
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

  const handleAmountChange = (value: string): void => {
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
    } catch (err: any) {
      if (err?.message?.includes('256-bit')) {
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
