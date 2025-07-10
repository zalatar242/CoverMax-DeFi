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
    args: [1000000n, [token, USDC?.address]], // Using 1 token (assuming 6 decimals for price check)
    query: {
      enabled: Boolean(token && USDC?.address && UniswapV2Router02)
    },
  });

  useEffect(() => {
    if (getAmountsOut && Array.isArray(getAmountsOut) && getAmountsOut[1]) {
      // Assuming the input token for price check (1000000n) effectively means 1 unit of the token
      // and the output USDC amount is for that 1 unit.
      const priceInUSDC = Number(formatUnits(getAmountsOut[1] as bigint, 6)); // USDC has 6 decimals
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
