import { useState, useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import type { Hash } from 'viem';

interface UseTransactionOptions {
  onSuccess?: () => void;
}

interface TransactionResponse {
  hash: Hash;
  [key: string]: any;
}

interface TransactionError extends Error {
  shortMessage?: string;
}

interface UseTransactionReturn {
  isProcessing: boolean;
  error: string;
  success: string;
  handleTransaction: (fn: () => Promise<Hash | TransactionResponse>) => Promise<void>;
}

export const useTransaction = ({ onSuccess }: UseTransactionOptions): UseTransactionReturn => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [hash, setHash] = useState<Hash | null>(null);

  const {
    data: receipt,
    isSuccess,
    isError,
    error: txError
  } = useWaitForTransactionReceipt({
    hash: hash || undefined,
    query: {
      enabled: Boolean(hash)
    }
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

  const handleTransaction = async (fn: () => Promise<Hash | TransactionResponse>): Promise<void> => {
    try {
      setError('');
      setSuccess('');
      setIsProcessing(true);
      const response = await fn();
      if (typeof response === 'string') {
        setHash(response as Hash);
      } else {
        setHash(response.hash);
      }
    } catch (err) {
      console.error('Transaction error:', err);
      const error = err as TransactionError;
      setError(error?.shortMessage || error?.message || 'Transaction failed');
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
