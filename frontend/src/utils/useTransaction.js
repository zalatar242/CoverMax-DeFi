import { useState, useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';

export const useTransaction = ({ hash, onSuccess, onError }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { isLoading: isWaiting } = useWaitForTransactionReceipt({
    hash,
    enabled: Boolean(hash),
    onSuccess: () => {
      setSuccess(onSuccess || 'Transaction successful!');
      onSuccess?.();
    },
    onError: (err) => {
      setError(onError || 'Transaction failed');
      onError?.(err);
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  // Reset loading state when no transaction hash
  useEffect(() => {
    if (!hash) {
      setIsProcessing(false);
    }
  }, [hash]);

  const handleTransaction = async (transactionFn) => {
    try {
      setError('');
      setSuccess('');
      setIsProcessing(true);
      await transactionFn();
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  return {
    isProcessing: isProcessing || isWaiting,
    error,
    success,
    setError,
    setSuccess,
    handleTransaction
  };
};
