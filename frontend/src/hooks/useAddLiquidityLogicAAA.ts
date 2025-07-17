import { useState, useMemo, useCallback, useEffect } from 'react';
import { useWriteContract, useConfig, useReadContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { useTransaction } from '../utils/useTransaction';
import { useAmountForm } from '../utils/useAmountForm';
import { useTokenData } from './useTokenData';

interface UseAddLiquidityLogicAAAParams {
  userAddress: string | undefined;
  routerConfig: any;
  tokenAConfig: any;
  tokenBConfig: any;
  onTransactionSuccess?: () => void;
}

export const useAddLiquidityLogicAAA = ({
  userAddress,
  routerConfig,
  tokenAConfig,
  tokenBConfig,
  onTransactionSuccess
}: UseAddLiquidityLogicAAAParams) => {
  const wagmiConfig = useConfig();
  const { writeContractAsync } = useWriteContract();

  // Get token data for both AAA and AA tokens
  const tokenAData = useTokenData(tokenAConfig?.address, routerConfig?.address, userAddress, tokenAConfig?.abi);
  const tokenBData = useTokenData(tokenBConfig?.address, routerConfig?.address, userAddress, tokenBConfig?.abi);

  // We need to get the factory address from the router to find the pair
  const { data: factoryAddress } = useReadContract({
    address: routerConfig?.address,
    abi: routerConfig?.abi,
    functionName: 'factory',
    query: {
      enabled: !!routerConfig?.address,
      staleTime: 300000 // Cache for 5 minutes
    }
  });

  // Amount forms for both tokens
  const {
    amount: amountA,
    error: amountAError,
    setError: setAmountAError,
    handleAmountChange: handleAmountAChange,
    validateAmount: validateAmountA,
    reset: resetAmountA,
    amountInWei: amountAInWei
  } = useAmountForm(tokenAData?.balance || 0n, 2);

  // Get the AAA-AA pair address from the factory
  const { data: pairAddress } = useReadContract({
    address: factoryAddress as `0x${string}`,
    abi: [{
      type: 'function',
      name: 'getPair',
      inputs: [
        { type: 'address', name: 'tokenA' },
        { type: 'address', name: 'tokenB' }
      ],
      outputs: [{ type: 'address', name: 'pair' }]
    }],
    functionName: 'getPair',
    args: [tokenAConfig?.address, tokenBConfig?.address],
    query: {
      enabled: !!tokenAConfig?.address && !!tokenBConfig?.address && !!factoryAddress,
      staleTime: 60000 // Cache for 1 minute
    }
  });

  // Get the current pool reserves
  const { data: reserves } = useReadContract({
    address: pairAddress as `0x${string}`,
    abi: [{
      type: 'function',
      name: 'getReserves',
      inputs: [],
      outputs: [
        { type: 'uint112', name: '_reserve0' },
        { type: 'uint112', name: '_reserve1' },
        { type: 'uint32', name: '_blockTimestampLast' }
      ]
    }],
    functionName: 'getReserves',
    query: {
      enabled: !!pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000',
      staleTime: 30000 // Cache for 30 seconds
    }
  });

  // Get token0 to determine which reserve is which
  const { data: token0 } = useReadContract({
    address: pairAddress as `0x${string}`,
    abi: [{
      type: 'function',
      name: 'token0',
      inputs: [],
      outputs: [{ type: 'address', name: '' }]
    }],
    functionName: 'token0',
    query: {
      enabled: !!pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000',
      staleTime: 300000 // Cache for 5 minutes (this rarely changes)
    }
  });

  // Calculate required amountB based on actual pool reserves
  const amountBInWei = useMemo(() => {
    if (!amountAInWei || amountAInWei === 0n) {
      return 0n;
    }

    // If we don't have reserves yet, fall back to 1:1 ratio
    if (!reserves || !Array.isArray(reserves) || reserves.length < 2 || !token0) {
      return amountAInWei;
    }

    const [reserve0, reserve1] = reserves as [bigint, bigint];

    // Determine which reserve corresponds to which token
    const isToken0AAA = (token0 as string)?.toLowerCase() === tokenAConfig?.address?.toLowerCase();
    const reserveAAA = isToken0AAA ? reserve0 : reserve1;
    const reserveAA = isToken0AAA ? reserve1 : reserve0;

    // If pool is empty, use 1:1 ratio
    if (reserveAAA === 0n || reserveAA === 0n) {
      return amountAInWei;
    }

    // Calculate required AA amount using AMM formula: (amountAAA * reserveAA) / reserveAAA
    // Add 0.1% slippage buffer to ensure transaction doesn't fail
    const requiredAA = (amountAInWei * reserveAA) / reserveAAA;
    const slippageBuffer = requiredAA * 1001n / 1000n; // Add 0.1% buffer

    return slippageBuffer;
  }, [amountAInWei, reserves, token0, tokenAConfig?.address]);

  const amountB = useMemo(() => {
    if (amountBInWei === 0n) return '';
    return (Number(amountBInWei) / Math.pow(10, 18)).toFixed(6);
  }, [amountBInWei]);

  const amountBError = '';
  const setAmountBError = () => {};
  const validateAmountB = () => true;
  const resetAmountB = () => {};

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
        tokenAData?.refetchAllowance();
        tokenAData?.refetchBalance();
        tokenBData?.refetchAllowance();
        tokenBData?.refetchBalance();
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
      resetAmountA();
      resetAmountB();
      // Add a small delay to ensure blockchain state is updated
      setTimeout(() => {
        tokenAData?.refetchAllowance();
        tokenAData?.refetchBalance();
        tokenBData?.refetchAllowance();
        tokenBData?.refetchBalance();
      }, 1000);
      if (onTransactionSuccess) {
        onTransactionSuccess();
      }
    }
  });

  // Handle dual token approval
  const handleApprove = useCallback(async () => {
    if (!tokenAConfig?.address || !tokenBConfig?.address || !routerConfig?.address) return;

    await handleApproveTransaction(async () => {
      // Approve token A first
      const approveTokenAHash = await writeContractAsync({
        address: tokenAConfig.address as `0x${string}`,
        abi: tokenAConfig.abi || [{
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
        args: [routerConfig.address, amountAInWei]
      });

      const tokenAReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: approveTokenAHash });
      if (tokenAReceipt.status !== 'success') {
        throw new Error('Token A approval transaction failed');
      }

      // Approve token B
      const approveTokenBHash = await writeContractAsync({
        address: tokenBConfig.address as `0x${string}`,
        abi: tokenBConfig.abi || [{
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
        args: [routerConfig.address, amountBInWei]
      });

      const tokenBReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: approveTokenBHash });
      if (tokenBReceipt.status !== 'success') {
        throw new Error('Token B approval transaction failed');
      }

      return approveTokenBHash;
    });
  }, [tokenAConfig, tokenBConfig, routerConfig?.address, amountAInWei, amountBInWei, handleApproveTransaction, writeContractAsync, wagmiConfig]);

  // Handle add liquidity
  const handleAddLiquidity = useCallback(async () => {
    if (!routerConfig || !userAddress || !tokenAConfig?.address || !tokenBConfig?.address) return;

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    // Calculate minimum amounts with 5% slippage tolerance
    const minAmountA = (amountAInWei * 95n) / 100n;
    const minAmountB = (amountBInWei * 95n) / 100n;

    console.log('Adding liquidity with params:', {
      tokenA: tokenAConfig.address,
      tokenB: tokenBConfig.address,
      amountADesired: amountAInWei.toString(),
      amountBDesired: amountBInWei.toString(),
      amountAMin: minAmountA.toString(),
      amountBMin: minAmountB.toString(),
      to: userAddress,
      deadline
    });

    await handleAddTransaction(async () => {
      const hash = await writeContractAsync({
        address: routerConfig.address as `0x${string}`,
        abi: routerConfig.abi,
        functionName: 'addLiquidity',
        args: [
          tokenAConfig.address as `0x${string}`,
          tokenBConfig.address as `0x${string}`,
          amountAInWei,
          amountBInWei,
          minAmountA,
          minAmountB,
          userAddress as `0x${string}`,
          deadline
        ]
      });
      return hash;
    });
  }, [routerConfig, userAddress, tokenAConfig?.address, tokenBConfig?.address, amountAInWei, amountBInWei, handleAddTransaction, writeContractAsync]);

  // Validation and state checks
  const needsApproval = useMemo(() => {
    const tokenANeedsApproval = amountAInWei > (tokenAData?.allowance || 0n);
    const tokenBNeedsApproval = amountBInWei > (tokenBData?.allowance || 0n);
    return tokenANeedsApproval || tokenBNeedsApproval;
  }, [amountAInWei, amountBInWei, tokenAData?.allowance, tokenBData?.allowance]);

  const canApprove = useMemo(() =>
    amountA &&
    amountBInWei > 0n &&
    validateAmountA(amountA) &&
    needsApproval &&
    !isApproving,
    [amountA, amountBInWei, validateAmountA, needsApproval, isApproving]
  );

  const canAdd = useMemo(() =>
    amountA &&
    amountBInWei > 0n &&
    validateAmountA(amountA) &&
    !needsApproval &&
    !isAdding,
    [amountA, amountBInWei, validateAmountA, needsApproval, isAdding]
  );

  const maxAmountA = useMemo(() => {
    if (!tokenAData?.balance) return 0;
    return Number(tokenAData.balance) / Math.pow(10, 18); // All tokens use 18 decimals
  }, [tokenAData?.balance]);

  const maxAmountB = useMemo(() => {
    if (!tokenBData?.balance) return 0;
    return Number(tokenBData.balance) / Math.pow(10, 18); // All tokens use 18 decimals
  }, [tokenBData?.balance]);

  return {
    // Token data
    tokenAData,
    tokenBData,

    // Amount forms
    amountA,
    amountAError,
    setAmountAError,
    handleAmountAChange,
    validateAmountA,
    amountAInWei,
    maxAmountA,

    amountB,
    amountBError,
    setAmountBError,
    validateAmountB,
    amountBInWei,
    maxAmountB,

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
