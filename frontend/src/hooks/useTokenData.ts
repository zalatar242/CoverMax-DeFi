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

  const { data: balance = 0n, refetch: refetchBalance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ['function balanceOf(address) view returns (uint256)'],
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
    query: { enabled },
  });

  const { data: decimals = 18 } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ['function decimals() view returns (uint8)'],
    functionName: 'decimals',
    query: { enabled: Boolean(tokenAddress) },
  });

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
      tokenData[token.address] = useTokenData(
        token.address,
        spenderAddress,
        userAddress,
        token.abi
      );
    }
  });

  return tokenData;
};
