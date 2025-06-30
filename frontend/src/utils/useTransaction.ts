import { useState, useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';

interface UseTransactionProps {
  onSuccess?: () => void;
}

interface UseTransactionReturn {
  isProcessing: boolean;
  error: string;
  success: string;
  handleTransaction: (fn: () => Promise<string | { hash: string }>) => Promise<void>;
}

export const useTransaction = ({ onSuccess }: UseTransactionProps): UseTransactionReturn => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [hash, setHash] = useState<`0x${string}` | undefined>(undefined);

  const {
    data: receipt,
    isSuccess,
    isError,
    error: txError
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: Boolean(hash)
    }
  });

  // Handle transaction status
  useEffect(() => {
    if (isError || txError) {
      setError(txError?.message || 'Transaction failed');
      setIsProcessing(false);
      setHash(undefined);
    } else if (receipt && isSuccess) {
      setSuccess('Transaction successful!');
      console.log('Transaction successful, calling onSuccess callback');
      onSuccess?.();
      setIsProcessing(false);
      setHash(undefined);
    }
  }, [receipt, isSuccess, isError, txError, onSuccess]);

  const handleTransaction = async (fn: () => Promise<string | { hash: string }>): Promise<void> => {
    try {
      setError('');
      setSuccess('');
      setIsProcessing(true);
      const response = await fn();
      if (typeof response === 'string') {
        setHash(response as `0x${string}`);
      } else {
        setHash(response.hash as `0x${string}`);
      }
    } catch (err: any) {
      console.error('Transaction error:', err);
      setError(err?.shortMessage || err?.message || 'Transaction failed');
      setIsProcessing(false);
      setHash(undefined);
    }
  };

  return {
    isProcessing,
    error,
    success,
    handleTransaction
  };
};
