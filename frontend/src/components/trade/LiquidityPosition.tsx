import React, { useEffect, useMemo } from 'react';
import { Typography, Stack, Paper, Divider, CircularProgress } from '@mui/material';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { useWalletConnection } from '../../utils/walletConnector';
import { useMainConfig, useContractsConfig } from '../../utils/contractConfig';

interface LiquidityPositionProps {
  token: string;
  symbol: string;
}

const LiquidityPosition: React.FC<LiquidityPositionProps> = ({ token, symbol }) => {
  const { address } = useWalletConnection();
  const { USDC } = useMainConfig();
  const contracts = useContractsConfig();
  const UniswapV2Factory = contracts?.UniswapV2Factory;

  const normalizedToken = token?.toLowerCase();
  const normalizedUSDC = USDC?.address?.toLowerCase();
  const factoryAddress = UniswapV2Factory?.address;

  const { data: pairAddress, error: pairError } = useReadContract({
    address: factoryAddress as `0x${string}`,
    abi: UniswapV2Factory?.abi,
    functionName: 'getPair',
    args: [normalizedToken as `0x${string}`, normalizedUSDC as `0x${string}`],
    query: {
      enabled: Boolean(normalizedToken && normalizedUSDC && factoryAddress && UniswapV2Factory?.abi),
    }
  });

  const pairABI = [
    { type: 'function', name: 'token0', constant: true, stateMutability: 'view', inputs: [], outputs: [{ type: 'address', name: '' }] },
    { type: 'function', name: 'getReserves', constant: true, stateMutability: 'view', inputs: [], outputs: [{ type: 'uint112', name: 'reserve0' }, { type: 'uint112', name: 'reserve1' }, { type: 'uint32', name: 'blockTimestampLast' }] }
  ];

  const { data: token0 } = useReadContract({
    address: pairAddress ? (pairAddress as `0x${string}`) : undefined,
    abi: pairABI,
    functionName: 'token0',
    query: {
      enabled: Boolean((pairAddress as string) && (pairAddress as string) !== '0x0000000000000000000000000000000000000000'),
    }
  });

  const { data: reserves } = useReadContract({
    address: pairAddress ? (pairAddress as `0x${string}`) : undefined,
    abi: pairABI,
    functionName: 'getReserves',
    query: {
      enabled: Boolean((pairAddress as string) && (pairAddress as string) !== '0x0000000000000000000000000000000000000000'),
    },
  });

  const { data: tokenDecimals } = useReadContract({
    address: token as `0x${string}`,
    abi: [{ type: 'function', name: 'decimals', constant: true, stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8', name: '' }] }],
    functionName: 'decimals',
    query: {
      enabled: Boolean(token),
    }
  });

  const actualTokenDecimals = tokenDecimals ?? 18;

  const lpTokenABI = [
    { type: 'function', name: 'balanceOf', constant: true, stateMutability: 'view', inputs: [{ type: 'address', name: 'account' }], outputs: [{ type: 'uint256', name: '' }] },
    { type: 'function', name: 'totalSupply', constant: true, stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256', name: '' }] }
  ];

  const { data: lpBalance = 0n } = useReadContract({
    address: pairAddress ? (pairAddress as `0x${string}`) : undefined,
    abi: lpTokenABI,
    functionName: 'balanceOf',
    args: [address ? (address as `0x${string}`) : undefined],
    query: {
      enabled: Boolean((pairAddress as string) && (pairAddress as string) !== '0x0000000000000000000000000000000000000000' && address),
    },
  });

  const { data: totalSupply = 0n } = useReadContract({
    address: pairAddress ? (pairAddress as `0x${string}`) : undefined,
    abi: lpTokenABI,
    functionName: 'totalSupply',
    query: {
      enabled: Boolean((pairAddress as string) && (pairAddress as string) !== '0x0000000000000000000000000000000000000000'),
    },
  });

  const sharePercent = useMemo(() => {
    if (!totalSupply || totalSupply === 0n) return 0;
    return (Number(lpBalance) / Number(totalSupply)) * 100;
  }, [lpBalance, totalSupply]);

  const [tokenReserve, usdcReserve] = useMemo(() => {
    if (!reserves || !token0) return [0n, 0n];
    const currentTokenNormalized = token?.toLowerCase();
    const token0Normalized = (token0 as string)?.toLowerCase();
    return currentTokenNormalized === token0Normalized
      ? [(reserves as any)?.[0] || 0n, (reserves as any)?.[1] || 0n]
      : [(reserves as any)?.[1] || 0n, (reserves as any)?.[0] || 0n];
  }, [reserves, token0, token]);

  useEffect(() => {
    if (pairError) {
      console.error(`Error fetching pair for ${symbol}:`, pairError.message);
    }
  }, [pairError, symbol]);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1">
            {symbol}/USDC Pool
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {!pairAddress && !pairError && (
              <>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Looking up pool...
                </Typography>
              </>
            )}
            {pairError && (
              <Typography variant="body2" color="error">
                Error loading pool
              </Typography>
            )}
            {pairAddress === '0x0000000000000000000000000000000000000000' && (
              <Typography variant="body2" color="warning.main">
                No pool exists
              </Typography>
            )}
            {(pairAddress as string) && (pairAddress as string) !== '0x0000000000000000000000000000000000000000' && (
              <Typography variant="body2" color="text.secondary">
                Pool: {(pairAddress as string)?.slice(0, 6)}...{(pairAddress as string)?.slice(-4)}
              </Typography>
            )}
          </Stack>
        </Stack>

        {(pairAddress as string) && (pairAddress as string) !== '0x0000000000000000000000000000000000000000' && (
          <Stack spacing={0.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">Your LP Tokens:</Typography>
              <Typography variant="body2">
                {Number(formatUnits(lpBalance as bigint, 6)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">Share of Pool:</Typography>
              <Typography variant="body2" color="text.secondary">
                {sharePercent.toFixed(4)}%
              </Typography>
            </Stack>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2" sx={{ mb: 1 }}>
              Pool Liquidity:
            </Typography>
            {(!reserves || !token0) ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Loading reserves...
                </Typography>
              </Stack>
            ) : (
              <>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">{symbol}:</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Number(formatUnits(tokenReserve, actualTokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">USDC:</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Number(formatUnits(usdcReserve, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Typography>
                </Stack>
              </>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

export default LiquidityPosition;
