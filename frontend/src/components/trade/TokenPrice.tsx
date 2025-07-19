import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { useContractsConfig, useTranchesConfig } from '../../utils/contractConfig';

interface TokenPriceProps {
  token: string;
  symbol: string;
  onTransactionSuccess?: () => void;
}

const TokenPrice: React.FC<TokenPriceProps> = ({ token, symbol }) => {
  const { UniswapV2Factory } = useContractsConfig();
  const { AAA, AA } = useTranchesConfig();
  const [price, setPrice] = useState<number | null>(null);

  // Get the AAA/AA pair address
  const { data: pairAddress } = useReadContract({
    address: UniswapV2Factory?.address,
    abi: UniswapV2Factory?.abi,
    functionName: 'getPair',
    args: [AAA?.address, AA?.address],
    query: {
      enabled: Boolean(AAA?.address && AA?.address && UniswapV2Factory?.address)
    },
  });

  // Get reserves from the pair
  const pairABI = [
    { type: 'function', name: 'token0', constant: true, stateMutability: 'view', inputs: [], outputs: [{ type: 'address', name: '' }] },
    { type: 'function', name: 'getReserves', constant: true, stateMutability: 'view', inputs: [], outputs: [{ type: 'uint112', name: 'reserve0' }, { type: 'uint112', name: 'reserve1' }, { type: 'uint32', name: 'blockTimestampLast' }] }
  ];

  const { data: token0 } = useReadContract({
    address: pairAddress as `0x${string}`,
    abi: pairABI,
    functionName: 'token0',
    query: {
      enabled: Boolean(pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000'),
    }
  });

  const { data: reserves } = useReadContract({
    address: pairAddress as `0x${string}`,
    abi: pairABI,
    functionName: 'getReserves',
    query: {
      enabled: Boolean(pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000'),
    },
  });

  useEffect(() => {
    if (reserves && token0 && AAA?.address && AA?.address) {
      const [reserve0, reserve1] = reserves as [bigint, bigint, number];
      const token0Address = (token0 as string).toLowerCase();
      const aaaAddress = AAA.address.toLowerCase();
      const aaAddress = AA.address.toLowerCase();

      // Determine which token we're pricing and calculate ratio
      if (token.toLowerCase() === aaaAddress) {
        // Pricing AAA token
        if (token0Address === aaaAddress) {
          // AAA is token0, so price = reserve1/reserve0 (AA per AAA)
          const aaPerAaa = Number(formatUnits(reserve1, 18)) / Number(formatUnits(reserve0, 18));
          setPrice(aaPerAaa);
        } else {
          // AAA is token1, so price = reserve0/reserve1 (AA per AAA)
          const aaPerAaa = Number(formatUnits(reserve0, 18)) / Number(formatUnits(reserve1, 18));
          setPrice(aaPerAaa);
        }
      } else if (token.toLowerCase() === aaAddress) {
        // Pricing AA token
        if (token0Address === aaAddress) {
          // AA is token0, so price = reserve1/reserve0 (AAA per AA)
          const aaaPerAa = Number(formatUnits(reserve1, 18)) / Number(formatUnits(reserve0, 18));
          setPrice(aaaPerAa);
        } else {
          // AA is token1, so price = reserve0/reserve1 (AAA per AA)
          const aaaPerAa = Number(formatUnits(reserve0, 18)) / Number(formatUnits(reserve1, 18));
          setPrice(aaaPerAa);
        }
      }
    }
  }, [reserves, token0, AAA?.address, AA?.address, token]);

  // Determine the price display based on which token we're showing
  const getDisplayText = () => {
    if (!AAA?.address || !AA?.address) return `1 ${symbol} = ...`;

    const isAAA = token.toLowerCase() === AAA.address.toLowerCase();
    const isAA = token.toLowerCase() === AA.address.toLowerCase();

    if (isAAA) {
      return `1 ${symbol} = ${price?.toFixed(4) || '...'} AA`;
    } else if (isAA) {
      return `1 ${symbol} = ${price?.toFixed(4) || '...'} AAA`;
    }

    return `1 ${symbol} = ...`;
  };

  return (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {getDisplayText()}
    </Typography>
  );
};

export default TokenPrice;
