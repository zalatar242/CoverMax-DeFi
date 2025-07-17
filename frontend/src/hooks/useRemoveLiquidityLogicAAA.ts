import { useState, useMemo, useCallback } from 'react';
import { useWriteContract, useConfig, useReadContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { formatUnits } from 'viem';
import { useTransaction } from '../utils/useTransaction';
import { useAmountForm } from '../utils/useAmountForm';

interface UseRemoveLiquidityLogicAAAParams {
  userAddress: string | undefined;
  routerConfig: any;
  factoryConfig: any;
  tokenAConfig: any;
  tokenBConfig: any;
  onTransactionSuccess?: () => void;
}

export const useRemoveLiquidityLogicAAA = ({
  userAddress,
  routerConfig,
  factoryConfig,
  tokenAConfig,
  tokenBConfig,
  onTransactionSuccess
}: UseRemoveLiquidityLogicAAAParams) => {
  const wagmiConfig = useConfig();
  const { writeContractAsync } = useWriteContract();

  // Get the AAA-AA pair address
  const { data: pairAddress } = useReadContract({
    address: factoryConfig?.address as `0x${string}`,
    abi: factoryConfig?.abi,
    functionName: 'getPair',
    args: [tokenAConfig?.address, tokenBConfig?.address],
    query: {
      enabled: !!tokenAConfig?.address && !!tokenBConfig?.address && !!factoryConfig?.address,
      staleTime: 60000
    }
  });

  // Get LP token balance
  const { data: lpBalance = 0n, refetch: refetchLPBalance } = useReadContract({
    address: pairAddress as `0x${string}`,
    abi: [
      {
        type: 'function',
        name: 'balanceOf',
        inputs: [{ type: 'address', name: 'account' }],
        outputs: [{ type: 'uint256', name: '' }]
      }
    ],
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
    query: {
      enabled: !!pairAddress && !!userAddress && pairAddress !== '0x0000000000000000000000000000000000000000',
      staleTime: 30000
    }
  });

  // Get LP token allowance
  const { data: lpAllowance = 0n, refetch: refetchLPAllowance } = useReadContract({
    address: pairAddress as `0x${string}`,
    abi: [
      {
        type: 'function',
        name: 'allowance',
        inputs: [
          { type: 'address', name: 'owner' },
          { type: 'address', name: 'spender' }
        ],
        outputs: [{ type: 'uint256', name: '' }]
      }
    ],
    functionName: 'allowance',
    args: [userAddress as `0x${string}`, routerConfig?.address as `0x${string}`],
    query: {
      enabled: !!pairAddress && !!userAddress && !!routerConfig?.address && pairAddress !== '0x0000000000000000000000000000000000000000',
      staleTime: 30000
    }
  });

  // Amount form for LP tokens to remove
  const {
    amount: liquidityAmount,
    error: liquidityAmountError,
    setError: setLiquidityError,
    handleAmountChange: handleLiquidityAmountChange,
    validateAmount: validateLiquidityAmount,
    reset: resetLiquidityAmount,
    amountInWei: liquidityAmountInWei
  } = useAmountForm((lpBalance as bigint) || 0n, 1);

  // Approval transaction for LP tokens
  const {
    isProcessing: isApproving,
    error: approveError,
    success: approveSuccess,
    handleTransaction: handleApproveTransaction
  } = useTransaction({
    onSuccess: async () => {
      setTimeout(() => {
        refetchLPAllowance();
      }, 1000);
    }
  });

  // Remove liquidity transaction
  const {
    isProcessing: isRemoving,
    error: removeError,
    success: removeSuccess,
    handleTransaction: handleRemoveTransaction
  } = useTransaction({
    onSuccess: () => {
      resetLiquidityAmount();
      setTimeout(() => {
        refetchLPBalance();
        refetchLPAllowance();
      }, 1000);
      onTransactionSuccess?.();
    }
  });

  // Handle LP token approval
  const handleApprove = useCallback(async () => {
    if (!pairAddress || !routerConfig?.address) return;

    await handleApproveTransaction(async () => {
      const hash = await writeContractAsync({
        address: pairAddress as `0x${string}`,
        abi: [
          {
            type: 'function',
            name: 'approve',
            inputs: [
              { type: 'address', name: 'spender' },
              { type: 'uint256', name: 'amount' }
            ],
            outputs: [{ type: 'bool', name: '' }]
          }
        ],
        functionName: 'approve',
        args: [routerConfig.address, liquidityAmountInWei]
      });
      return hash;
    });
  }, [pairAddress, routerConfig?.address, liquidityAmountInWei, handleApproveTransaction, writeContractAsync]);

  // Handle remove liquidity
  const handleRemoveLiquidity = useCallback(async () => {
    if (!routerConfig || !userAddress || !tokenAConfig?.address || !tokenBConfig?.address) return;

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    await handleRemoveTransaction(async () => {
      const hash = await writeContractAsync({
        address: routerConfig.address as `0x${string}`,
        abi: routerConfig.abi,
        functionName: 'removeLiquidity',
        args: [
          tokenAConfig.address as `0x${string}`,
          tokenBConfig.address as `0x${string}`,
          liquidityAmountInWei,
          0, // Min amounts (set to 0 for simplicity)
          0,
          userAddress as `0x${string}`,
          deadline
        ]
      });
      return hash;
    });
  }, [routerConfig, userAddress, tokenAConfig?.address, tokenBConfig?.address, liquidityAmountInWei, handleRemoveTransaction, writeContractAsync]);

  // Validation and state checks
  const needsApproval = useMemo(() =>
    liquidityAmountInWei > 0n && liquidityAmountInWei > (lpAllowance as bigint || 0n),
    [liquidityAmountInWei, lpAllowance]
  );

  const canApprove = useMemo(() =>
    liquidityAmount &&
    validateLiquidityAmount(liquidityAmount) &&
    needsApproval &&
    !isApproving,
    [liquidityAmount, validateLiquidityAmount, needsApproval, isApproving]
  );

  const canRemove = useMemo(() =>
    liquidityAmount &&
    validateLiquidityAmount(liquidityAmount) &&
    !needsApproval &&
    !isRemoving,
    [liquidityAmount, validateLiquidityAmount, needsApproval, isRemoving]
  );

  const maxAmount = useMemo(() => {
    if (!lpBalance) return 0;
    // Use the same conversion logic as useAmountForm validation to avoid precision issues
    const formattedBalance = Number(formatUnits(lpBalance as bigint, 18));
    // Subtract a tiny amount to avoid precision issues
    return formattedBalance - 0.000001;
  }, [lpBalance]);

  const formattedLPBalance = useMemo(() => {
    if (!lpBalance) return '0';
    return (Number(lpBalance) / Math.pow(10, 18)).toFixed(6);
  }, [lpBalance]);

  const formattedLPAllowance = useMemo(() => {
    if (!lpAllowance) return '0';
    return (Number(lpAllowance) / Math.pow(10, 18)).toFixed(6);
  }, [lpAllowance]);

  return {
    // LP token data
    lpBalance,
    lpAllowance,
    formattedLPBalance,
    formattedLPAllowance,
    maxAmount,

    // Amount form
    liquidityAmount,
    liquidityAmountError,
    setLiquidityError,
    handleLiquidityAmountChange,
    validateLiquidityAmount,

    // Transactions
    handleApprove,
    handleRemoveLiquidity,
    isApproving,
    isRemoving,

    // Validation
    needsApproval,
    canApprove,
    canRemove,

    // Errors and success
    approveError,
    removeError,
    approveSuccess,
    removeSuccess
  };
};
