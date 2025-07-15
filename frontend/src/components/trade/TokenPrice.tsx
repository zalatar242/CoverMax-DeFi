import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { useMainConfig } from '../../utils/contractConfig';

interface TokenPriceProps {
  token: string;
  symbol: string;
  onTransactionSuccess?: () => void;
}

const TokenPrice: React.FC<TokenPriceProps> = ({ token, symbol }) => {
  const { UniswapV2Router02, USDC } = useMainConfig();
  const [price, setPrice] = useState<number | null>(null);

  const { data: getAmountsOut } = useReadContract({
    address: UniswapV2Router02?.address,
    abi: UniswapV2Router02?.abi,
    functionName: 'getAmountsOut',
    args: [1000000000000000000n, [token, USDC?.address]], // Using 1 token (18 decimals)
    query: {
      enabled: Boolean(token && USDC?.address && UniswapV2Router02)
    },
  });

  useEffect(() => {
    if (getAmountsOut && Array.isArray(getAmountsOut) && getAmountsOut[1]) {
      // The input is 1 token (1000000000000000000n = 1 * 10^18)
      // and the output USDC amount is for that 1 token.
      const priceInUSDC = Number(formatUnits(getAmountsOut[1] as bigint, 18)); // USDC has 18 decimals
      setPrice(priceInUSDC);
    }
  }, [getAmountsOut]);

  return (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      1 {symbol} = ${price?.toFixed(2) || '...'} USDC
    </Typography>
  );
};

export default TokenPrice;
