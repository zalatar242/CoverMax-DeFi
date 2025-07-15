import { useState, useMemo, useCallback } from 'react';
import { useWriteContract, useConfig } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { useTransaction } from '../utils/useTransaction';
import { useAmountForm } from '../utils/useAmountForm';
import { useTokenData } from './useTokenData';

interface UseAddLiquidityLogicParams {
  userAddress: string | undefined;
  routerConfig: any;
  usdcConfig: any;
  onTransactionSuccess?: () => void;
}

export const useAddLiquidityLogic = ({
  userAddress,
  routerConfig,
  usdcConfig,
  onTransactionSuccess
}: UseAddLiquidityLogicParams) => {
  const [selectedToken, setSelectedToken] = useState('');
  const wagmiConfig = useConfig();
  const { writeContractAsync } = useWriteContract();

  // Get token data for selected token and USDC
  const selectedTokenData = useTokenData(selectedToken, routerConfig?.address, userAddress, undefined);
  const usdcTokenData = useTokenData(usdcConfig?.address, routerConfig?.address, userAddress, usdcConfig?.abi);

  // Amount form
  const {
    amount: liquidityAmount,
    error: liquidityAmountError,
    setError: setLiquidityError,
    handleAmountChange: handleLiquidityAmountChange,
    validateAmount: validateLiquidityAmount,
    reset: resetLiquidityAmount,
    amountInWei: liquidityAmountInWei
  } = useAmountForm(selectedTokenData?.balance || 0n, 2);

  // Approval transaction (handles both tokens)
  const {
    isProcessing: isApproving,
    error: approveError,
    success: approveSuccess,
    handleTransaction: handleApproveTransaction
  } = useTransaction({
    onSuccess: async () => {
      // Add a small delay to ensure blockchain state is updated
      setTimeout(() => {
        selectedTokenData?.refetchAllowance();
        selectedTokenData?.refetchBalance();
        usdcTokenData?.refetchAllowance();
        usdcTokenData?.refetchBalance();
      }, 1000);
    }
  });

  // Add liquidity transaction
  const {
    isProcessing: isAdding,
    error: addError,
    success: addSuccess,
    handleTransaction: handleAddTransaction
  } = useTransaction({
    onSuccess: () => {
      resetLiquidityAmount();
      // Add a small delay to ensure blockchain state is updated
      setTimeout(() => {
        selectedTokenData?.refetchAllowance();
        selectedTokenData?.refetchBalance();
        usdcTokenData?.refetchAllowance();
        usdcTokenData?.refetchBalance();
      }, 1000);
      if (onTransactionSuccess) {
        onTransactionSuccess();
      }
    }
  });

  // Handle dual token approval
  const handleApprove = useCallback(async () => {
    if (!selectedToken || !routerConfig?.address || !usdcConfig?.address) return;

    await handleApproveTransaction(async () => {
      // Approve selected token first
      const approveTokenHash = await writeContractAsync({
        address: selectedToken as `0x${string}`,
        abi: selectedToken === usdcConfig?.address ? usdcConfig?.abi : [{
          type: 'function',
          name: 'approve',
          constant: false,
          inputs: [
            { type: 'address', name: 'spender' },
            { type: 'uint256', name: 'amount' }
          ],
          outputs: [{ type: 'bool', name: '' }]
        }],
        functionName: 'approve',
        args: [routerConfig.address, liquidityAmountInWei]
      });

      const tokenReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: approveTokenHash });
      if (tokenReceipt.status !== 'success') {
        throw new Error('Token approval transaction failed');
      }

      // Approve USDC
      const approveUSDCHash = await writeContractAsync({
        address: usdcConfig.address as `0x${string}`,
        abi: usdcConfig.abi,
        functionName: 'approve',
        args: [routerConfig.address, liquidityAmountInWei]
      });

      const usdcReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: approveUSDCHash });
      if (usdcReceipt.status !== 'success') {
        throw new Error('USDC approval transaction failed');
      }

      return approveUSDCHash;
    });
  }, [selectedToken, routerConfig?.address, usdcConfig, liquidityAmountInWei, handleApproveTransaction, writeContractAsync, wagmiConfig]);

  // Handle add liquidity
  const handleAddLiquidity = useCallback(async () => {
    if (!routerConfig || !userAddress || !selectedToken || !usdcConfig?.address) return;

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    await handleAddTransaction(async () => {
      const hash = await writeContractAsync({
        address: routerConfig.address as `0x${string}`,
        abi: routerConfig.abi,
        functionName: 'addLiquidity',
        args: [
          selectedToken as `0x${string}`,
          usdcConfig.address as `0x${string}`,
          liquidityAmountInWei,
          liquidityAmountInWei, // Assuming 1:1 for simplicity
          0, // Min amounts
          0,
          userAddress as `0x${string}`,
          deadline
        ]
      });
      return hash;
    });
  }, [routerConfig, userAddress, selectedToken, usdcConfig?.address, liquidityAmountInWei, handleAddTransaction, writeContractAsync]);

  // Validation and state checks
  const needsApproval = useMemo(() => {
    const tokenNeedsApproval = liquidityAmountInWei > (selectedTokenData?.allowance || 0n);
    const usdcNeedsApproval = liquidityAmountInWei > (usdcTokenData?.allowance || 0n);
    const result = tokenNeedsApproval || usdcNeedsApproval;

    console.log('Approval check:', {
      liquidityAmountInWei: liquidityAmountInWei.toString(),
      tokenAllowance: selectedTokenData?.allowance?.toString() || '0',
      usdcAllowance: usdcTokenData?.allowance?.toString() || '0',
      tokenNeedsApproval,
      usdcNeedsApproval,
      needsApproval: result
    });

    return result;
  }, [liquidityAmountInWei, selectedTokenData?.allowance, usdcTokenData?.allowance]);

  const canApprove = useMemo(() =>
    liquidityAmount &&
    selectedToken &&
    validateLiquidityAmount(liquidityAmount) &&
    needsApproval &&
    !isApproving,
    [liquidityAmount, selectedToken, validateLiquidityAmount, needsApproval, isApproving]
  );

  const canAdd = useMemo(() =>
    liquidityAmount &&
    selectedToken &&
    validateLiquidityAmount(liquidityAmount) &&
    !needsApproval &&
    !isAdding,
    [liquidityAmount, selectedToken, validateLiquidityAmount, needsApproval, isAdding]
  );

  const maxAmount = useMemo(() => {
    if (!selectedTokenData?.balance || !usdcTokenData?.balance) return 0;
    const tokenAmount = Number(selectedTokenData.balance) / Math.pow(10, 18); // All tokens use 18 decimals
    const usdcAmount = Number(usdcTokenData.balance) / Math.pow(10, 18); // All tokens use 18 decimals
    return Math.min(tokenAmount, usdcAmount);
  }, [selectedTokenData?.balance, usdcTokenData?.balance]);

  return {
    // Token selection
    selectedToken,
    setSelectedToken,

    // Token data
    selectedTokenData,
    usdcTokenData,

    // Amount form
    liquidityAmount,
    liquidityAmountError,
    setLiquidityError,
    handleLiquidityAmountChange,
    validateLiquidityAmount,
    liquidityAmountInWei,
    maxAmount,

    // Transactions
    handleApprove,
    handleAddLiquidity,
    isApproving,
    isAdding,

    // Validation
    needsApproval,
    canApprove,
    canAdd,

    // Errors and success
    approveError,
    addError,
    approveSuccess,
    addSuccess
  };
};
