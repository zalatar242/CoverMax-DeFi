import { useState, useMemo, useCallback } from 'react';
import { useWriteContract, useReadContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { useTransaction } from '../utils/useTransaction';
import { useAmountForm } from '../utils/useAmountForm';

interface UseLiquidityLogicParams {
  userAddress: string | undefined;
  routerConfig: any;
  factoryConfig: any;
  usdcConfig: any;
  onTransactionSuccess?: () => void;
}

export const useLiquidityLogic = ({
  userAddress,
  routerConfig,
  factoryConfig,
  usdcConfig,
  onTransactionSuccess
}: UseLiquidityLogicParams) => {
  const [selectedToken, setSelectedToken] = useState('');

  const { writeContractAsync } = useWriteContract();

  // Get pair address for liquidity operations
  const { data: pairAddress } = useReadContract({
    address: factoryConfig?.address?.toLowerCase() as `0x${string}`,
    abi: factoryConfig?.abi,
    functionName: 'getPair',
    args: [selectedToken?.toLowerCase() as `0x${string}`, usdcConfig?.address?.toLowerCase() as `0x${string}`],
    query: {
      enabled: Boolean(selectedToken && usdcConfig?.address && factoryConfig?.address && factoryConfig?.abi)
    }
  });

  // Get LP token balance (18 decimals)
  const { data: lpBalance = 0n, refetch: refetchLPBalance } = useReadContract({
    address: (pairAddress as string)?.toLowerCase() as `0x${string}`,
    abi: [{ type: 'function', name: 'balanceOf', constant: true, stateMutability: 'view', inputs: [{ type: 'address', name: 'account' }], outputs: [{ type: 'uint256', name: '' }] }],
    functionName: 'balanceOf',
    args: [userAddress?.toLowerCase() as `0x${string}`],
    query: {
      enabled: Boolean(pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000' && userAddress)
    }
  });

  // Get LP token allowance (18 decimals)
  const { data: lpAllowance = 0n, refetch: refetchLPAllowance } = useReadContract({
    address: (pairAddress as string)?.toLowerCase() as `0x${string}`,
    abi: [{ type: 'function', name: 'allowance', constant: true, stateMutability: 'view', inputs: [{ type: 'address', name: 'owner' }, { type: 'address', name: 'spender' }], outputs: [{ type: 'uint256', name: '' }] }],
    functionName: 'allowance',
    args: [userAddress?.toLowerCase() as `0x${string}`, (routerConfig?.address as string)?.toLowerCase() as `0x${string}`],
    query: {
      enabled: Boolean(pairAddress && (pairAddress as string) !== '0x0000000000000000000000000000000000000000' && userAddress && routerConfig?.address)
    }
  });

  // Format LP balance for UI (6 decimals for display)
  const formattedLPBalance = useMemo(() => {
    return formatUnits(lpBalance, 6);
  }, [lpBalance]);

  // Amount form for LP token removal
  const {
    amount: liquidityAmount,
    error: liquidityAmountError,
    setError: setLiquidityError,
    handleAmountChange: handleLiquidityAmountChange,
    validateAmount: validateLiquidityAmount,
    reset: resetLiquidityAmount,
  } = useAmountForm(parseUnits(formattedLPBalance, 6), 1, 6);

  // Approval transaction
  const {
    isProcessing: isApproving,
    error: approveError,
    success: approveSuccess,
    handleTransaction: handleApproveTransaction
  } = useTransaction({
    onSuccess: () => {
      refetchLPAllowance();
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
      refetchLPAllowance();
      refetchLPBalance();
      if (onTransactionSuccess) {
        onTransactionSuccess();
      }
    }
  });

  // Calculate actual LP amount from UI amount
  const calculateActualLPAmount = useCallback((uiAmountString: string) => {
    if (!lpBalance || lpBalance === 0n || !uiAmountString) return 0n;
    const userInputAmount = Number(uiAmountString);
    const maxUIDisplayAmount = Number(formatUnits(lpBalance, 6));
    if (maxUIDisplayAmount === 0) return 0n;
    const ratio = userInputAmount / maxUIDisplayAmount;
    const actualAmount = BigInt(Math.floor(Number(lpBalance) * ratio)); // eslint-disable-line no-undef -- BigInt is a standard global
    return actualAmount;
  }, [lpBalance]);

  const actualLPAmount = useMemo(() =>
    calculateActualLPAmount(liquidityAmount),
    [calculateActualLPAmount, liquidityAmount]
  );

  // Approve LP tokens
  const handleApprove = useCallback(async () => {
    if (!pairAddress || !routerConfig?.address) return;

    await handleApproveTransaction(async () => {
      const hash = await writeContractAsync({
        address: (pairAddress as string)?.toLowerCase() as `0x${string}`,
        abi: [{ type: 'function', name: 'approve', constant: false, inputs: [{ type: 'address', name: 'spender' }, { type: 'uint256', name: 'amount' }], outputs: [{ type: 'bool', name: '' }] }],
        functionName: 'approve',
        args: [(routerConfig.address as string)?.toLowerCase() as `0x${string}`, actualLPAmount]
      });
      return hash;
    });
  }, [pairAddress, routerConfig?.address, actualLPAmount, handleApproveTransaction, writeContractAsync]);

  // Remove liquidity
  const handleRemoveLiquidity = useCallback(async () => {
    if (!routerConfig || !userAddress || !selectedToken || !usdcConfig?.address) return;

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    await handleRemoveTransaction(async () => {
      const hash = await writeContractAsync({
        address: (routerConfig.address as string)?.toLowerCase() as `0x${string}`,
        abi: routerConfig.abi,
        functionName: 'removeLiquidity',
        args: [
          (selectedToken as string)?.toLowerCase() as `0x${string}`,
          (usdcConfig.address as string)?.toLowerCase() as `0x${string}`,
          actualLPAmount,
          0, // Min amounts
          0,
          (userAddress as string)?.toLowerCase() as `0x${string}`,
          deadline
        ]
      });
      return hash;
    });
  }, [routerConfig, userAddress, selectedToken, usdcConfig?.address, actualLPAmount, handleRemoveTransaction, writeContractAsync]);

  // Validation and state checks
  const needsApproval = useMemo(() =>
    actualLPAmount > lpAllowance,
    [actualLPAmount, lpAllowance]
  );

  const canApprove = useMemo(() =>
    liquidityAmount &&
    selectedToken &&
    validateLiquidityAmount(liquidityAmount) &&
    needsApproval &&
    !isApproving,
    [liquidityAmount, selectedToken, validateLiquidityAmount, needsApproval, isApproving]
  );

  const canRemove = useMemo(() =>
    liquidityAmount &&
    selectedToken &&
    !needsApproval &&
    !isRemoving,
    [liquidityAmount, selectedToken, needsApproval, isRemoving]
  );

  return {
    // Token selection
    selectedToken,
    setSelectedToken,

    // LP token data
    pairAddress,
    lpBalance,
    lpAllowance,
    formattedLPBalance,

    // Amount form
    liquidityAmount,
    liquidityAmountError,
    setLiquidityError,
    handleLiquidityAmountChange,
    validateLiquidityAmount,
    actualLPAmount,

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
