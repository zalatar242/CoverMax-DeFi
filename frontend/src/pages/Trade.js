import React, { useState, useEffect, useMemo } from 'react';
import { useTranchesConfig } from '../utils/contractConfig';
import { Button, Stack, CircularProgress, Typography, Box, Divider, Paper } from '@mui/material';
import { SwapHoriz, Pool, Remove } from '@mui/icons-material';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { useMainConfig, useContractsConfig } from '../utils/contractConfig';
import { useWriteContract, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { useTransaction } from '../utils/useTransaction';
import { useAmountForm } from '../utils/useAmountForm';
import {
  ContentCard,
  AmountField,
  TransactionAlerts,
  TokenSelect
} from '../components/ui';

const TokenPrice = ({ token, symbol }) => {
  const { UniswapV2Router02, USDC } = useMainConfig();
  const [price, setPrice] = useState(null);

  const { data: getAmountsOut } = useReadContract({
    address: UniswapV2Router02?.address,
    abi: UniswapV2Router02?.abi,
    functionName: 'getAmountsOut',
    args: [1000000n, [token, USDC?.address]], // Using 1 token as base
    enabled: Boolean(token && USDC?.address && UniswapV2Router02),
    watch: true,
  });

  useEffect(() => {
    if (getAmountsOut && getAmountsOut[1]) {
      const priceInUSDC = Number(formatUnits(getAmountsOut[1], 6));
      setPrice(priceInUSDC / 1);
    }
  }, [getAmountsOut]);

  return (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      1 {symbol} = ${price?.toFixed(2) || '...'} USDC
    </Typography>
  );
};

const LiquidityPosition = ({ token, symbol }) => {
  const { address } = useWalletConnection();
  const { USDC } = useMainConfig();
  const contracts = useContractsConfig();
  const UniswapV2Factory = contracts?.UniswapV2Factory;

  // Ensure addresses are in checksum format
  console.log('Raw token addresses:', {
    inputToken: token,
    inputUSDC: USDC?.address,
    factoryAddress: UniswapV2Factory?.address
  });

  const normalizedToken = token?.toLowerCase();
  const normalizedUSDC = USDC?.address?.toLowerCase();
  const factoryAddress = UniswapV2Factory?.address;

  console.log('Contract setup:', {
    normalizedToken,
    normalizedUSDC,
    factoryAddress,
    symbol
  });

  console.log('Token details:', {
    token,
    normalizedToken,
    USDC_address: USDC?.address,
    normalizedUSDC,
    factoryAddress,
    factoryABI: UniswapV2Factory?.abi
  });

  // First get the pair address from the factory
  const { data: pairAddress, error: pairError } = useReadContract({
    address: factoryAddress,
    abi: UniswapV2Factory?.abi,
    functionName: 'getPair',
    args: [normalizedToken, normalizedUSDC],
    enabled: Boolean(normalizedToken && normalizedUSDC && factoryAddress && UniswapV2Factory?.abi),
    watch: true,
  });

  // Effect to monitor contract read attempts
  useEffect(() => {
    console.log('Contract read details:', {
      factoryEnabled: Boolean(normalizedToken && normalizedUSDC && factoryAddress && UniswapV2Factory?.abi),
      pairAddress,
      pairError: pairError?.message,
      args: [normalizedToken, normalizedUSDC]
    });
  }, [normalizedToken, normalizedUSDC, factoryAddress, UniswapV2Factory?.abi, pairAddress, pairError]);

  console.log('Pair lookup result:', {
    pairAddress,
    pairError,
    hasFactory: Boolean(UniswapV2Factory),
    factoryEnabled: Boolean(normalizedToken && normalizedUSDC && factoryAddress)
  });

  // If there's an error fetching the pair, log it
  useEffect(() => {
    if (pairError) {
      console.error('Error fetching pair:', pairError);
    }
  }, [pairError]);

  // Get token0 to determine reserve order
  const pairABI = [
    {
      type: 'function',
      name: 'token0',
      constant: true,
      stateMutability: 'view',
      payable: false,
      inputs: [],
      outputs: [{ type: 'address', name: '' }]
    },
    {
      type: 'function',
      name: 'getReserves',
      constant: true,
      stateMutability: 'view',
      payable: false,
      inputs: [],
      outputs: [
        { type: 'uint112', name: 'reserve0' },
        { type: 'uint112', name: 'reserve1' },
        { type: 'uint32', name: 'blockTimestampLast' }
      ]
    }
  ];

  const { data: token0, error: token0Error } = useReadContract({
    address: pairAddress,
    abi: pairABI,
    functionName: 'token0',
    enabled: Boolean(pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000'),
  });

  // Get reserves to show liquidity info
  const { data: reserves, error: reservesError } = useReadContract({
    address: pairAddress,
    abi: pairABI,
    functionName: 'getReserves',
    enabled: Boolean(pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000'),
    watch: true,
  });

  // Get token decimals
  const { data: tokenDecimals } = useReadContract({
    address: token,
    abi: [
      {
        type: 'function',
        name: 'decimals',
        constant: true,
        stateMutability: 'view',
        payable: false,
        inputs: [],
        outputs: [{ type: 'uint8', name: '' }]
      }
    ],
    functionName: 'decimals',
    enabled: Boolean(token),
  });

  // Use the fetched token decimals or default to 18 for AAA/AA tokens
  const actualTokenDecimals = tokenDecimals ?? 18;

  // LP Token functions ABI
  const lpTokenABI = [
    {
      type: 'function',
      name: 'balanceOf',
      constant: true,
      stateMutability: 'view',
      payable: false,
      inputs: [{ type: 'address', name: 'account' }],
      outputs: [{ type: 'uint256', name: '' }]
    },
    {
      type: 'function',
      name: 'totalSupply',
      constant: true,
      stateMutability: 'view',
      payable: false,
      inputs: [],
      outputs: [{ type: 'uint256', name: '' }]
    }
  ];

  // Get LP token balance
  const { data: lpBalance = 0n } = useReadContract({
    address: pairAddress,
    abi: lpTokenABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000' && address),
    watch: true,
  });

  // Get total supply to calculate share percentage
  const { data: totalSupply = 0n } = useReadContract({
    address: pairAddress,
    abi: lpTokenABI,
    functionName: 'totalSupply',
    enabled: Boolean(pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000'),
    watch: true,
  });

  // Calculate share percentage using bigint operations to avoid precision loss
  const sharePercent = useMemo(() => {
    if (!totalSupply || totalSupply === 0n) return 0;
    // Convert to number only at the end of calculation
    const share = (Number(lpBalance * 10000n) / Number(totalSupply)) * 0.01;
    return share;
  }, [lpBalance, totalSupply]);

  // Calculate token amounts based on reserve order with proper decimals
  const [tokenReserve, usdcReserve] = useMemo(() => {
    if (!reserves || !token0) return [0n, 0n];

    // Compare addresses case-insensitively
    const isToken0 = token?.toLowerCase() === token0?.toLowerCase();
    const token0IsAAA = token0?.toLowerCase() === token?.toLowerCase();

    console.log('Reserve order check:', {
      isToken0,
      token0Address: token0,
      tokenAddress: token,
      token0IsAAA,
      reserves: reserves.map(r => r.toString())
    });

    if (isToken0) {
      return [reserves[0] || 0n, reserves[1] || 0n];
    } else {
      return [reserves[1] || 0n, reserves[0] || 0n];
    }
  }, [reserves, token0, token]);

  // Debug position and reserves
  useEffect(() => {
    if (reserves) {
      console.log('Position and reserve details:', {
        lpBalance: {
          raw: lpBalance.toString(),
          formatted: lpBalance > 0n ? formatUnits(lpBalance, 18) : '0'
        },
        totalSupply: {
          raw: totalSupply.toString(),
          formatted: totalSupply > 0n ? formatUnits(totalSupply, 18) : '0'
        },
        sharePercent,
        tokenReserve: {
          raw: tokenReserve.toString(),
          formatted: tokenReserve > 0n ? formatUnits(tokenReserve, actualTokenDecimals) : '0',
          decimals: actualTokenDecimals
        },
        usdcReserve: {
          raw: usdcReserve.toString(),
          formatted: usdcReserve > 0n ? formatUnits(usdcReserve, 6) : '0'
        }
      });
    }
  }, [reserves, lpBalance, totalSupply, sharePercent, tokenReserve, usdcReserve, actualTokenDecimals]);

  // Monitor reserves and token ordering
  useEffect(() => {
    console.log('Reserves details:', {
      hasValidPair: Boolean(pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000'),
      token0: token0,
      token0Error: token0Error?.message,
      reserves: reserves,
      reservesError: reservesError?.message,
      tokenAddress: token,
      usdcAddress: USDC?.address,
      calculatedTokenReserve: tokenReserve?.toString(),
      calculatedUsdcReserve: usdcReserve?.toString()
    });
  }, [pairAddress, token0, token0Error, reserves, reservesError, tokenReserve, usdcReserve, token, USDC]);


  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Stack spacing={1}>
        {/* Pool Header */}
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
                Error loading pool details
              </Typography>
            )}
            {pairAddress === '0x0000000000000000000000000000000000000000' && (
              <Typography variant="body2" color="warning.main">
                No pool exists
              </Typography>
            )}
            {pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000' && (
              <Typography variant="body2" color="text.secondary">
                Pool: {pairAddress.slice(0, 6)}...{pairAddress.slice(-4)}
              </Typography>
            )}
          </Stack>
        </Stack>

        {/* Pool Content */}
        {pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000' && (
          <Stack spacing={0.5}>
            {/* LP Token Balance */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">Your LP Tokens:</Typography>
              <Typography variant="body2">
                {Number(formatUnits(lpBalance, 6)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </Typography>
            </Stack>

            {/* Share of Pool */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">Share of Pool:</Typography>
              <Typography variant="body2" color="text.secondary">
                {sharePercent.toFixed(4)}%
              </Typography>
            </Stack>

            {/* Pool Liquidity */}
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

const WalletRequiredPrompt = ({ openConnectModal }) => (
  <ContentCard title="Connect Wallet to Trade">
    <Button
      variant="contained"
      onClick={openConnectModal}
      size="large"
      fullWidth
      sx={{
        py: 1.5,
        px: 4
      }}
    >
      Connect Wallet
    </Button>
  </ContentCard>
);

const Trade = () => {
  const { isConnected, address } = useWalletConnection();
  const { openConnectModal } = useWalletModal();
  const { USDC, UniswapV2Router02 } = useMainConfig();
  const { AAA, AA } = useTranchesConfig();

  const [selectedFromToken, setSelectedFromToken] = useState('');
  const [selectedToToken, setSelectedToToken] = useState('');
  const [selectedLiquidityToken, setSelectedLiquidityToken] = useState('');
  const [removeLiquidityToken, setRemoveLiquidityToken] = useState('');
  const [activeTab, setActiveTab] = useState('swap'); // 'swap', 'addLiquidity', 'removeLiquidity'

  const { data: fromTokenDecimals = 6 } = useReadContract({
    address: selectedFromToken,
    abi: ['function decimals() view returns (uint8)'],
    functionName: 'decimals',
    enabled: Boolean(selectedFromToken),
  });

  const { data: liquidityTokenDecimals = 6 } = useReadContract({
    address: selectedLiquidityToken,
    abi: ['function decimals() view returns (uint8)'],
    functionName: 'decimals',
    enabled: Boolean(selectedLiquidityToken),
  });

  const { data: fromTokenBalance = 0n } = useReadContract({
    address: selectedFromToken,
    abi: ['function balanceOf(address) view returns (uint256)'],
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && selectedFromToken && isConnected),
  });

  const { data: liquidityTokenBalance = 0n } = useReadContract({
    address: selectedLiquidityToken,
    abi: ['function balanceOf(address) view returns (uint256)'],
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && selectedLiquidityToken && isConnected),
  });

  const {
    amount: swapAmount,
    error: swapAmountError,
    setError: setSwapError,
    handleAmountChange: handleSwapAmountChange,
    validateAmount: validateSwapAmount,
    reset: resetSwapAmount,
    amountInWei: swapAmountInWei
  } = useAmountForm(fromTokenBalance, 2, fromTokenDecimals);

  const {
    amount: liquidityAmount,
    error: liquidityAmountError,
    setError: setLiquidityError,
    handleAmountChange: handleLiquidityAmountChange,
    validateAmount: validateLiquidityAmount,
    reset: resetLiquidityAmount,
    amountInWei: liquidityAmountInWei
  } = useAmountForm(liquidityTokenBalance, 2, liquidityTokenDecimals);

  const {
    amount: removeLiquidityAmount,
    error: removeLiquidityError,
    setError: setRemoveLiquidityError,
    handleAmountChange: handleRemoveLiquidityAmountChange,
    validateAmount: validateRemoveLiquidityAmount,
    reset: resetRemoveLiquidityAmount,
    amountInWei: removeLiquidityAmountInWei
  } = useAmountForm(0n, 2, 18); // LP tokens typically have 18 decimals

  const { data: usdcBalance = 0n } = useReadContract({
    address: USDC?.address,
    abi: USDC?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && USDC && isConnected),
  });

  const { data: fromTokenAllowance = 0n, refetch: refetchFromTokenAllowance } = useReadContract({
    address: selectedFromToken,
    abi: selectedFromToken === USDC?.address ? USDC?.abi : AAA?.abi,
    functionName: 'allowance',
    args: [address, UniswapV2Router02?.address],
    enabled: Boolean(address && selectedFromToken && UniswapV2Router02 && isConnected),
  });

  const { refetch: refetchToTokenAllowance } = useReadContract({
    address: selectedToToken,
    abi: selectedToToken === USDC?.address ? USDC?.abi : AAA?.abi,
    functionName: 'allowance',
    args: [address, UniswapV2Router02?.address],
    enabled: Boolean(address && selectedToToken && UniswapV2Router02 && isConnected),
  });

  const { data: liquidityTokenAllowance = 0n, refetch: refetchLiquidityTokenAllowance } = useReadContract({
    address: selectedLiquidityToken,
    abi: selectedLiquidityToken === USDC?.address ? USDC?.abi : AAA?.abi,
    functionName: 'allowance',
    args: [address, UniswapV2Router02?.address],
    enabled: Boolean(address && selectedLiquidityToken && UniswapV2Router02 && isConnected),
    watch: true,
  });

  const { data: usdcAllowance = 0n, refetch: refetchUSDCAllowance } = useReadContract({
    address: USDC?.address,
    abi: USDC?.abi,
    functionName: 'allowance',
    args: [address, UniswapV2Router02?.address],
    enabled: Boolean(address && USDC && UniswapV2Router02 && isConnected),
  });

  const { isProcessing: isApprovingSwap, error: approveSwapError, success: approveSwapSuccess, handleTransaction: handleApproveSwap } =
    useTransaction({
      onSuccess: () => {
        refetchFromTokenAllowance();
      }
    });

  const { isProcessing: isSwapping, error: swapError, success: swapSuccess, handleTransaction: handleSwapTransaction } =
    useTransaction({
      onSuccess: () => {
        resetSwapAmount();
        refetchFromTokenAllowance();
        refetchToTokenAllowance();
      }
    });

  const { isProcessing: isApprovingLiquidity, error: approveLiquidityError, success: approveLiquiditySuccess, handleTransaction: handleApproveLiquidity } =
    useTransaction({
      onSuccess: async () => {
        // After USDC approval completes, update both allowances
        await Promise.all([
          refetchLiquidityTokenAllowance(),
          refetchUSDCAllowance()
        ]);
      }
    });

  const { isProcessing: isAddingLiquidity, error: addLiquidityError, success: addLiquiditySuccess, handleTransaction: handleAddLiquidityTransaction } =
    useTransaction({
      onSuccess: () => {
        resetLiquidityAmount();
        refetchLiquidityTokenAllowance();
        refetchUSDCAllowance();
      }
    });

  const { isProcessing: isRemovingLiquidity, error: removeLiquidityTransactionError, success: removeLiquiditySuccess, handleTransaction: handleRemoveLiquidityTransaction } =
    useTransaction({
      onSuccess: () => {
        resetRemoveLiquidityAmount();
      }
    });

  const { writeContractAsync } = useWriteContract();

  const handleSwap = async () => {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
    handleSwapTransaction(async () => {
      try {
        const hash = await writeContractAsync({
          address: UniswapV2Router02.address,
          abi: UniswapV2Router02.abi,
          functionName: 'swapExactTokensForTokens',
          args: [
            swapAmountInWei,
            0, // Min output amount
            [selectedFromToken, selectedToToken],
            address,
            deadline
          ]
        });
        console.log('Swap hash:', hash);
        return hash;
      } catch (err) {
        console.error('Swap error:', err);
        throw err;
      }
    });
  };

  const handleApproveSwapClick = () => {
    handleApproveSwap(async () => {
      try {
        const hash = await writeContractAsync({
          address: selectedFromToken,
          abi: selectedFromToken === USDC?.address ? USDC?.abi : AAA?.abi, // Use appropriate abi based on token
          functionName: 'approve',
          args: [UniswapV2Router02.address, swapAmountInWei]
        });
        console.log('Approve hash:', hash);
        await refetchFromTokenAllowance();
        return hash;
      } catch (err) {
        console.error('Approval error:', err);
        throw err;
      }
    });
  };

  const handleApproveLiquidityClick = () => {
    handleApproveLiquidity(async () => {
      try {
        // First approve the tranche token
        const approveTokenHash = await writeContractAsync({
          address: selectedLiquidityToken,
          abi: selectedLiquidityToken === USDC?.address ? USDC?.abi : AAA?.abi,
          functionName: 'approve',
          args: [UniswapV2Router02.address, liquidityAmountInWei]
        });
        console.log('Approve token hash:', approveTokenHash);

        // Wait for the first transaction to complete and check for success
        await new Promise((resolve, reject) => {
          const checkReceipt = async () => {
            try {
              const provider = await window.ethereum;
              const receipt = await provider.request({
                method: 'eth_getTransactionReceipt',
                params: [approveTokenHash],
              });
              if (receipt) {
                if (receipt.status === '0x1') {
                  await refetchLiquidityTokenAllowance();
                  resolve();
                } else {
                  reject(new Error('First approval transaction failed'));
                }
              } else {
                setTimeout(checkReceipt, 1000);
              }
            } catch (err) {
              console.error('Error checking receipt:', err);
              setTimeout(checkReceipt, 1000);
            }
          };
          checkReceipt();
        });

        // Then approve USDC
        const approveUSDCHash = await writeContractAsync({
          address: USDC.address,
          abi: USDC.abi,
          functionName: 'approve',
          args: [UniswapV2Router02.address, liquidityAmountInWei]
        });
        console.log('Approve USDC hash:', approveUSDCHash);

        // Wait for USDC transaction receipt
        await new Promise((resolve, reject) => {
          const checkReceipt = async () => {
            try {
              const provider = await window.ethereum;
              const receipt = await provider.request({
                method: 'eth_getTransactionReceipt',
                params: [approveUSDCHash],
              });
              if (receipt && receipt.status === '0x1') {
                await refetchUSDCAllowance();
                resolve();
              } else if (receipt && receipt.status !== '0x1') {
                reject(new Error('USDC approval transaction failed'));
              } else {
                setTimeout(checkReceipt, 1000);
              }
            } catch (err) {
              console.error('Error checking USDC receipt:', err);
              setTimeout(checkReceipt, 1000);
            }
          };
          checkReceipt();
        });

        // Return USDC hash for transaction tracking
        return approveUSDCHash;
      } catch (err) {
        console.error('Approval error:', err);
        throw err;
      }
    });
  };

  const handleRemoveLiquidity = () => {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
    handleRemoveLiquidityTransaction(async () => {
      try {
        const hash = await writeContractAsync({
          address: UniswapV2Router02.address,
          abi: UniswapV2Router02.abi,
          functionName: 'removeLiquidity',
          args: [
            removeLiquidityToken,
            USDC.address,
            removeLiquidityAmountInWei,
            0, // Min amounts
            0,
            address,
            deadline
          ]
        });
        console.log('Remove liquidity hash:', hash);
        return hash;
      } catch (err) {
        console.error('Remove liquidity error:', err);
        throw err;
      }
    });
  };

  const handleAddLiquidity = () => {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
    handleAddLiquidityTransaction(async () => {
      try {
        const hash = await writeContractAsync({
          address: UniswapV2Router02.address,
          abi: UniswapV2Router02.abi,
          functionName: 'addLiquidity',
          args: [
            selectedLiquidityToken,
            USDC.address,
            liquidityAmountInWei,
            liquidityAmountInWei,
            0, // Min amounts
            0,
            address,
            deadline
          ]
        });
        console.log('Add liquidity hash:', hash);
        return hash;
      } catch (err) {
        console.error('Add liquidity error:', err);
        throw err;
      }
    });
  };

  const trancheTokens = [
    { address: AAA?.address, symbol: 'AAA' },
    { address: AA?.address, symbol: 'AA' },
    { address: USDC?.address, symbol: 'USDC' }
  ].filter(token => token.address);

  if (!isConnected) {
    return <WalletRequiredPrompt openConnectModal={openConnectModal} />;
  }

  return (
    <Stack spacing={3}>
      {/* Navigation Tabs */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2}>
          <Button
            variant={activeTab === 'swap' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('swap')}
          >
            Swap
          </Button>
          <Button
            variant={activeTab === 'addLiquidity' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('addLiquidity')}
          >
            Add Liquidity
          </Button>
          <Button
            variant={activeTab === 'removeLiquidity' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('removeLiquidity')}
          >
            Remove Liquidity
          </Button>
        </Stack>
      </Box>

      {/* Token Prices */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Current Prices</Typography>
        <Stack spacing={1}>
          <TokenPrice token={AAA?.address} symbol="AAA" />
          <TokenPrice token={AA?.address} symbol="AA" />
        </Stack>
      </Paper>

      {/* Your Liquidity Positions */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Your Liquidity Positions</Typography>
        <LiquidityPosition token={AAA?.address} symbol="AAA" />
        <LiquidityPosition token={AA?.address} symbol="AA" />
      </Paper>

      {activeTab === 'swap' && (
        <ContentCard title="Swap Tranches">
        <TransactionAlerts
          error={swapAmountError || approveSwapError || swapError}
          success={approveSwapSuccess || swapSuccess}
        />

        <Stack spacing={3}>
          <div>
            <TokenSelect
              token={selectedFromToken}
              onTokenChange={setSelectedFromToken}
              tokens={trancheTokens}
              label="From Token"
            />
            <TokenSelect
              token={selectedToToken}
              onTokenChange={setSelectedToToken}
              tokens={trancheTokens.filter(t => t.address !== selectedFromToken)}
              label="To Token"
            />
            <AmountField
              amount={swapAmount}
              setAmount={handleSwapAmountChange}
              validateAmount={validateSwapAmount}
              setError={setSwapError}
              label="Amount to Swap"
            />
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              Current Balance: {formatUnits(fromTokenBalance, fromTokenDecimals)} {trancheTokens.find(t => t.address === selectedFromToken)?.symbol}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Current Allowance: {formatUnits(fromTokenAllowance, fromTokenDecimals)} {trancheTokens.find(t => t.address === selectedFromToken)?.symbol}
            </Typography>
          </div>

          <Stack direction="row" spacing={2}>
            <Button
              fullWidth
              variant={swapAmountInWei > fromTokenAllowance ? "contained" : "outlined"}
              onClick={handleApproveSwapClick}
              disabled={!swapAmount || !selectedFromToken || !selectedToToken || isApprovingSwap || !validateSwapAmount(swapAmount) || swapAmountInWei <= fromTokenAllowance}
              startIcon={isApprovingSwap ? <CircularProgress size={24} /> : <SwapHoriz />}
              color="primary"
            >
              1. Approve Token
            </Button>
            <Button
              fullWidth
              variant={swapAmountInWei <= fromTokenAllowance ? "contained" : "outlined"}
              onClick={handleSwap}
              disabled={!swapAmount || !selectedFromToken || !selectedToToken || isSwapping || swapAmountInWei > fromTokenAllowance}
              startIcon={isSwapping ? <CircularProgress size={24} /> : <SwapHoriz />}
              color="primary"
            >
              2. Swap
            </Button>
          </Stack>
        </Stack>
      </ContentCard>)}

      {activeTab === 'addLiquidity' && (
        <ContentCard title="Add Liquidity">
        <TransactionAlerts
          error={liquidityAmountError || approveLiquidityError || addLiquidityError}
          success={approveLiquiditySuccess || addLiquiditySuccess}
        />

        <Stack spacing={3}>
          <div>
            <TokenSelect
              token={selectedLiquidityToken}
              onTokenChange={setSelectedLiquidityToken}
              tokens={trancheTokens.filter(t => t.address !== USDC.address)}
              label="Select Token"
            />
            <AmountField
              amount={liquidityAmount}
              setAmount={handleLiquidityAmountChange}
              validateAmount={validateLiquidityAmount}
              setError={setLiquidityError}
              label="Amount to Deposit"
            />
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              Token Balance: {formatUnits(liquidityTokenBalance, liquidityTokenDecimals)} {trancheTokens.find(t => t.address === selectedLiquidityToken)?.symbol}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              Token Allowance: {formatUnits(liquidityTokenAllowance, liquidityTokenDecimals)} {trancheTokens.find(t => t.address === selectedLiquidityToken)?.symbol}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              USDC Balance: {formatUnits(usdcBalance, 6)} USDC
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              USDC Allowance: {formatUnits(usdcAllowance, 6)} USDC
            </Typography>
          </div>

          <Stack direction="row" spacing={2}>
            <Button
              fullWidth
              variant={(liquidityAmountInWei > liquidityTokenAllowance || liquidityAmountInWei > usdcAllowance) ? "contained" : "outlined"}
              onClick={handleApproveLiquidityClick}
              disabled={!liquidityAmount || !selectedLiquidityToken || isApprovingLiquidity || !validateLiquidityAmount(liquidityAmount)}
              startIcon={isApprovingLiquidity ? <CircularProgress size={24} /> : <Pool />}
            >
              1. Approve Tokens
            </Button>
            <Button
              fullWidth
              variant={(liquidityAmountInWei <= liquidityTokenAllowance && liquidityAmountInWei <= usdcAllowance) ? "contained" : "outlined"}
              onClick={handleAddLiquidity}
              disabled={!liquidityAmount || !selectedLiquidityToken || isAddingLiquidity || liquidityAmountInWei > liquidityTokenAllowance || liquidityAmountInWei > usdcAllowance}
              startIcon={isAddingLiquidity ? <CircularProgress size={24} /> : <Pool />}
            >
              2. Add Liquidity
            </Button>
          </Stack>
        </Stack>
      </ContentCard>)}

      {activeTab === 'removeLiquidity' && (
        <ContentCard title="Remove Liquidity">
          <TransactionAlerts
            error={removeLiquidityError || removeLiquidityTransactionError}
            success={removeLiquiditySuccess}
          />

          <Stack spacing={3}>
            <div>
              <TokenSelect
                token={removeLiquidityToken}
                onTokenChange={setRemoveLiquidityToken}
                tokens={trancheTokens.filter(t => t.address !== USDC.address)}
                label="Select Pool"
              />
              <AmountField
                amount={removeLiquidityAmount}
                setAmount={handleRemoveLiquidityAmountChange}
                validateAmount={validateRemoveLiquidityAmount}
                setError={setRemoveLiquidityError}
                label="Amount of LP Tokens"
              />
            </div>

            <Button
              fullWidth
              variant="contained"
              onClick={handleRemoveLiquidity}
              disabled={!removeLiquidityAmount || !removeLiquidityToken || isRemovingLiquidity}
              startIcon={isRemovingLiquidity ? <CircularProgress size={24} /> : <Remove />}
            >
              Remove Liquidity
            </Button>
          </Stack>
        </ContentCard>)}
    </Stack>
  );
};

export default Trade;
