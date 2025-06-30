import { useReadContract } from 'wagmi';
import { useMemo } from 'react';

// Unified hook for token balance, allowance, and metadata
export const useTokenData = (
  tokenAddress: string | undefined,
  spenderAddress: string | undefined,
  userAddress: string | undefined,
  tokenAbi?: any[]
) => {
  const enabled = Boolean(tokenAddress && userAddress);
  const allowanceEnabled = Boolean(tokenAddress && spenderAddress && userAddress);

  const { data: balance = 0n, refetch: refetchBalance, error: balanceError } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi || ['function balanceOf(address) view returns (uint256)'],
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
    query: { enabled },
  });

  // Debug logging for balance errors
  if (balanceError && enabled) {
    console.error(`Balance fetch error for token ${tokenAddress}:`, balanceError);
  }

  const { data: decimals = 18, error: decimalsError } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ['function decimals() view returns (uint8)'],
    functionName: 'decimals',
    query: { enabled: Boolean(tokenAddress) },
  });

  // Debug logging for decimals errors
  if (decimalsError && tokenAddress) {
    console.error(`Decimals fetch error for token ${tokenAddress}:`, decimalsError);
  }

  const { data: symbol = '' } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ['function symbol() view returns (string)'],
    functionName: 'symbol',
    query: { enabled: Boolean(tokenAddress) },
  });

  const { data: allowance = 0n, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi || ['function allowance(address,address) view returns (uint256)'],
    functionName: 'allowance',
    args: [userAddress as `0x${string}`, spenderAddress as `0x${string}`],
    query: { enabled: allowanceEnabled },
  });

  return useMemo(() => ({
    balance: balance as bigint,
    decimals: decimals as number,
    symbol: symbol as string,
    allowance: allowance as bigint,
    refetchBalance,
    refetchAllowance,
    isLoading: enabled && balance === undefined,
    abi: tokenAbi
  }), [balance, decimals, symbol, allowance, refetchBalance, refetchAllowance, enabled, tokenAbi]);
};

// Hook for multiple tokens
export const useMultipleTokenData = (
  tokens: { address?: string; abi?: any[] }[],
  spenderAddress: string | undefined,
  userAddress: string | undefined
) => {
  const tokenData: Record<string, any> = {};

  tokens.forEach(token => {
    if (token.address) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      tokenData[token.address.toLowerCase()] = useTokenData(
        token.address,
        spenderAddress,
        userAddress,
        token.abi
      );
    }
  });

  return tokenData;
};
