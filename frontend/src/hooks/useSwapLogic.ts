import { useState, useCallback, useMemo } from 'react';
import { useWriteContract, useReadContract } from 'wagmi';
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

  const fromToken = fromTokenData[selectedFromToken?.toLowerCase()];
  const toToken = toTokenData[selectedToToken?.toLowerCase()];

  const {
    amount: swapAmount,
    error: swapAmountError,
    setError: setSwapError,
    handleAmountChange: handleSwapAmountChange,
    validateAmount: validateSwapAmount,
    reset: resetSwapAmount,
    amountInWei: swapAmountInWei
  } = useAmountForm(fromToken?.balance || 0n, 2, fromToken?.decimals || 18);

  // Get expected output amount using getAmountsOut
  const { data: expectedAmounts } = useReadContract({
    address: routerConfig?.address as `0x${string}`,
    abi: routerConfig?.abi,
    functionName: 'getAmountsOut',
    args: swapAmountInWei > 0n && selectedFromToken && selectedToToken ? 
      [swapAmountInWei, [selectedFromToken as `0x${string}`, selectedToToken as `0x${string}`]] : 
      undefined,
    query: {
      enabled: swapAmountInWei > 0n && !!selectedFromToken && !!selectedToToken && !!routerConfig
    }
  });

  const expectedOutputAmount = useMemo(() => {
    if (!expectedAmounts || !Array.isArray(expectedAmounts) || expectedAmounts.length < 2) {
      return 0n;
    }
    return expectedAmounts[1] as bigint;
  }, [expectedAmounts]);

  // Calculate minimum output with slippage (default 2%)
  const [slippagePercentage, setSlippagePercentage] = useState(2);
  const minOutputAmount = useMemo(() => {
    if (expectedOutputAmount === 0n) return 0n;
    const slippageFactor = BigInt(10000 - slippagePercentage * 100); // 2% = 9800
    return (expectedOutputAmount * slippageFactor) / 10000n;
  }, [expectedOutputAmount, slippagePercentage]);

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
    if (!routerConfig || !userAddress || !selectedFromToken || !selectedToToken) return;

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    // Use calculated minimum output amount with slippage protection
    const minAmountOut = minOutputAmount > 0n ? minOutputAmount : 1n; // Fallback to 1 if no calculation available

    console.log('Swap parameters:', {
      amountIn: swapAmountInWei.toString(),
      expectedOutput: expectedOutputAmount.toString(),
      minAmountOut: minAmountOut.toString(),
      slippage: `${slippagePercentage}%`,
      path: [selectedFromToken, selectedToToken],
      deadline
    });

    // Validate that we have liquidity
    if (expectedOutputAmount === 0n) {
      console.error('No liquidity available for this swap');
      setSwapError('Insufficient liquidity in the pool');
      return;
    }

    await handleSwapTransaction(async () => {
      const hash = await writeContractAsync({
        address: routerConfig.address as `0x${string}`,
        abi: routerConfig.abi,
        functionName: 'swapExactTokensForTokens',
        args: [
          swapAmountInWei,
          minAmountOut,
          [selectedFromToken as `0x${string}`, selectedToToken as `0x${string}`],
          userAddress as `0x${string}`,
          deadline
        ],
        gas: 300000n // Explicit gas limit - let wallet/RPC determine gas price automatically
      });
      return hash;
    });
  }, [routerConfig, userAddress, selectedFromToken, selectedToToken, swapAmountInWei, expectedOutputAmount, minOutputAmount, slippagePercentage, handleSwapTransaction, writeContractAsync, setSwapError]);

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
    validateSwapAmount(swapAmount) &&
    !needsApproval &&
    !isSwapping,
    [swapAmount, selectedFromToken, selectedToToken, validateSwapAmount, needsApproval, isSwapping]
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
    toToken,

    // Price calculation
    expectedOutputAmount,
    minOutputAmount,
    slippagePercentage,
    setSlippagePercentage
  };
};
