import { useState, useCallback, useMemo } from 'react';
import { useWriteContract } from 'wagmi';
import { useTransaction } from '../utils/useTransaction';
import { useAmountForm } from '../utils/useAmountForm';

interface UseSwapLogicParams {
  fromTokenData: any;
  toTokenData: any;
  routerConfig: any;
  userAddress: string | undefined;
  onTransactionSuccess?: () => void;
}

export const useSwapLogic = ({
  fromTokenData,
  toTokenData,
  routerConfig,
  userAddress,
  onTransactionSuccess
}: UseSwapLogicParams) => {
  const [selectedFromToken, setSelectedFromToken] = useState('');
  const [selectedToToken, setSelectedToToken] = useState('');

  const { writeContractAsync } = useWriteContract();

  const fromToken = fromTokenData[selectedFromToken];
  const toToken = toTokenData[selectedToToken];

  const {
    amount: swapAmount,
    error: swapAmountError,
    setError: setSwapError,
    handleAmountChange: handleSwapAmountChange,
    validateAmount: validateSwapAmount,
    reset: resetSwapAmount,
    amountInWei: swapAmountInWei
  } = useAmountForm(fromToken?.balance || 0n, 2);

  // Approval transaction
  const {
    isProcessing: isApproving,
    error: approveError,
    success: approveSuccess,
    handleTransaction: handleApproveTransaction
  } = useTransaction({
    onSuccess: () => {
      fromToken?.refetchAllowance();
    }
  });

  // Swap transaction
  const {
    isProcessing: isSwapping,
    error: swapError,
    success: swapSuccess,
    handleTransaction: handleSwapTransaction
  } = useTransaction({
    onSuccess: () => {
      resetSwapAmount();
      fromToken?.refetchBalance();
      fromToken?.refetchAllowance();
      toToken?.refetchBalance();
      toToken?.refetchAllowance();
      onTransactionSuccess?.();
    }
  });

  const handleApprove = useCallback(async () => {
    if (!fromToken || !routerConfig) return;

    await handleApproveTransaction(async () => {
      const hash = await writeContractAsync({
        address: selectedFromToken as `0x${string}`,
        abi: fromToken.abi || ['function approve(address,uint256) returns (bool)'],
        functionName: 'approve',
        args: [routerConfig.address, swapAmountInWei]
      });
      return hash;
    });
  }, [fromToken, routerConfig, selectedFromToken, swapAmountInWei, handleApproveTransaction, writeContractAsync]);

  const handleSwap = useCallback(async () => {
    if (!routerConfig || !userAddress) return;

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    await handleSwapTransaction(async () => {
      const hash = await writeContractAsync({
        address: routerConfig.address as `0x${string}`,
        abi: routerConfig.abi,
        functionName: 'swapExactTokensForTokens',
        args: [
          swapAmountInWei,
          0n, // Min output amount
          [selectedFromToken as `0x${string}`, selectedToToken as `0x${string}`],
          userAddress as `0x${string}`,
          deadline
        ]
      });
      return hash;
    });
  }, [routerConfig, userAddress, selectedFromToken, selectedToToken, swapAmountInWei, handleSwapTransaction, writeContractAsync]);

  // Validation and state checks
  const needsApproval = useMemo(() =>
    swapAmountInWei > 0n && swapAmountInWei > (fromToken?.allowance || 0n),
    [swapAmountInWei, fromToken?.allowance]
  );

  const canApprove = useMemo(() =>
    swapAmount &&
    selectedFromToken &&
    selectedToToken &&
    validateSwapAmount(swapAmount) &&
    needsApproval &&
    !isApproving,
    [swapAmount, selectedFromToken, selectedToToken, validateSwapAmount, needsApproval, isApproving]
  );

  const canSwap = useMemo(() =>
    swapAmount &&
    selectedFromToken &&
    selectedToToken &&
    !needsApproval &&
    !isSwapping,
    [swapAmount, selectedFromToken, selectedToToken, needsApproval, isSwapping]
  );

  return {
    // State
    selectedFromToken,
    selectedToToken,
    setSelectedFromToken,
    setSelectedToToken,

    // Amount form
    swapAmount,
    swapAmountError,
    setSwapError,
    handleSwapAmountChange,
    validateSwapAmount,
    swapAmountInWei,

    // Transactions
    handleApprove,
    handleSwap,
    isApproving,
    isSwapping,

    // Validation
    needsApproval,
    canApprove,
    canSwap,

    // Errors and success
    approveError,
    swapError,
    approveSuccess,
    swapSuccess,

    // Token data
    fromToken,
    toToken
  };
};
