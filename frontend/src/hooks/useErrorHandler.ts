import { useState, useCallback } from 'react';

export const useErrorHandler = () => {
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((error: any, context: string = '') => {
    console.error(`Error in ${context}:`, error);

    let errorMessage = 'An unexpected error occurred';

    // Handle common error types
    if (error?.shortMessage) {
      errorMessage = error.shortMessage;
    } else if (error?.message) {
      if (error.message.includes('User rejected')) {
        errorMessage = 'Transaction was rejected';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction';
      } else if (error.message.includes('allowance')) {
        errorMessage = 'Token allowance insufficient';
      } else if (error.message.includes('slippage')) {
        errorMessage = 'Transaction failed due to slippage';
      } else {
        errorMessage = error.message;
      }
    }

    setError(errorMessage);
    // toast.error(errorMessage); // Temporarily disabled - react-toastify not installed
    return errorMessage;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError
  };
};
