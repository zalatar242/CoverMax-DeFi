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

  // Format LP balance for UI (18 decimals - LP tokens are ERC20 with 18 decimals)
  const formattedLPBalance = useMemo(() => {
    return formatUnits(lpBalance, 18);
  }, [lpBalance]);

  // Format LP allowance for UI (18 decimals - LP tokens are ERC20 with 18 decimals)
  const formattedLPAllowance = useMemo(() => {
    return formatUnits(lpAllowance, 18);
  }, [lpAllowance]);

  // Amount form for LP token removal (18 decimals for LP tokens)
  const {
    amount: liquidityAmount,
    error: liquidityAmountError,
    setError: setLiquidityError,
    handleAmountChange: handleLiquidityAmountChange,
    validateAmount: validateLiquidityAmount,
    reset: resetLiquidityAmount,
  } = useAmountForm(parseUnits(formattedLPBalance, 18), 1, 18);

  // Approval transaction
  const {
    isProcessing: isApproving,
    error: approveError,
    success: approveSuccess,
    handleTransaction: handleApproveTransaction
  } = useTransaction({
    onSuccess: () => {
      console.log('LP approval transaction success, refetching allowance...');
      // Add delay to ensure blockchain state has updated
      setTimeout(() => {
        console.log('Refetching LP allowance after 1 second delay');
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
      console.log('Remove liquidity transaction success, refetching data...');
      resetLiquidityAmount();
      setTimeout(() => {
        console.log('Refetching LP allowance and balance after remove liquidity');
        refetchLPAllowance();
        refetchLPBalance();
      }, 1000);
      if (onTransactionSuccess) {
        onTransactionSuccess();
      }
    }
  });

  // Calculate actual LP amount from UI amount (simplified since we're using 18 decimals throughout)
  const calculateActualLPAmount = useCallback((uiAmountString: string) => {
    if (!lpBalance || lpBalance === 0n || !uiAmountString) return 0n;

    // Since we're using 18 decimals consistently, just parse the user input directly
    const actualAmount = parseUnits(uiAmountString, 18);

    // Ensure we don't exceed the user's balance
    const finalAmount = actualAmount > lpBalance ? lpBalance : actualAmount;

    console.log('LP Amount calculation:', {
      userInputAmount: uiAmountString,
      userInputAmountInWei: actualAmount.toString(),
      lpBalance: lpBalance.toString(),
      maxUIDisplayAmount: formatUnits(lpBalance, 18),
      actualAmount: finalAmount.toString()
    });

    return finalAmount;
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
  const needsApproval = useMemo(() => {
    const needs = actualLPAmount > lpAllowance;
    console.log('LP Approval check:', {
      actualLPAmount: actualLPAmount.toString(),
      lpAllowance: lpAllowance.toString(),
      needsApproval: needs
    });
    return needs;
  }, [actualLPAmount, lpAllowance]);

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
    formattedLPAllowance,

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
