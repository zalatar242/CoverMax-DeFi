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
    abi: tokenAbi || [{
      type: 'function',
      name: 'balanceOf',
      constant: true,
      inputs: [{ type: 'address', name: 'owner' }],
      outputs: [{ type: 'uint256', name: '' }]
    }],
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
    query: { enabled },
  });

  // Debug logging for balance errors
  if (balanceError && enabled) {
    console.error(`Balance fetch error for token ${tokenAddress}:`, balanceError);
  }

  const { data: decimals, error: decimalsError } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: [{
      type: 'function',
      name: 'decimals',
      constant: true,
      inputs: [],
      outputs: [{ type: 'uint8', name: '' }]
    }],
    functionName: 'decimals',
    query: { enabled: Boolean(tokenAddress) },
  });

  // Get fallback decimals based on token type
  const getDecimalsFallback = (address: string | undefined): number => {
    if (!address) return 18;
    const lowerAddress = address.toLowerCase();
    // USDC typically uses 6 decimals
    if (lowerAddress === '0xd17aef210dec93d3521950e18ab8783e4e488fd4') {
      return 6;
    }
    // Default to 18 for other tokens
    return 18;
  };

  const finalDecimals = decimals ?? getDecimalsFallback(tokenAddress);

  // Debug logging for decimals errors
  if (decimalsError && tokenAddress) {
    console.error(`Decimals fetch error for token ${tokenAddress}:`, decimalsError);
  }

  const { data: symbol = '' } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: [{
      type: 'function',
      name: 'symbol',
      constant: true,
      inputs: [],
      outputs: [{ type: 'string', name: '' }]
    }],
    functionName: 'symbol',
    query: { enabled: Boolean(tokenAddress) },
  });

  const { data: allowance = 0n, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: tokenAbi || [{
      type: 'function',
      name: 'allowance',
      constant: true,
      inputs: [
        { type: 'address', name: 'owner' },
        { type: 'address', name: 'spender' }
      ],
      outputs: [{ type: 'uint256', name: '' }]
    }],
    functionName: 'allowance',
    args: [userAddress as `0x${string}`, spenderAddress as `0x${string}`],
    query: { enabled: allowanceEnabled },
  });

  return useMemo(() => ({
    balance: balance as bigint,
    decimals: finalDecimals as number,
    symbol: symbol as string,
    allowance: allowance as bigint,
    refetchBalance,
    refetchAllowance,
    isLoading: enabled && balance === undefined,
    abi: tokenAbi
  }), [balance, finalDecimals, symbol, allowance, refetchBalance, refetchAllowance, enabled, tokenAbi]);
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
