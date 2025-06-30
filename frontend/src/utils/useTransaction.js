import { useState, useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';

export const useTransaction = ({ onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hash, setHash] = useState(null);

  const {
    data: receipt,
    isSuccess,
    isError,
    error: txError
  } = useWaitForTransactionReceipt({
    hash,
    enabled: Boolean(hash)
  });

  // Handle transaction status
  useEffect(() => {
    if (isError || txError) {
      setError(txError?.message || 'Transaction failed');
      setIsProcessing(false);
      setHash(null);
    } else if (receipt && isSuccess) {
      setSuccess('Transaction successful!');
      onSuccess?.();
      setIsProcessing(false);
      setHash(null);
    }
  }, [receipt, isSuccess, isError, txError, onSuccess]);

  const handleTransaction = async (fn) => {
    try {
      setError('');
      setSuccess('');
      setIsProcessing(true);
      const response = await fn();
      if (typeof response === 'string') {
        setHash(response);
      } else {
        setHash(response.hash);
      }
    } catch (err) {
      console.error('Transaction error:', err);
      setError(err?.shortMessage || err?.message || 'Transaction failed');
      setIsProcessing(false);
      setHash(null);
    }
  };

  return {
    isProcessing,
    error,
    success,
    handleTransaction
  };
};
