import React, { useState } from 'react';
import { useTranchesConfig } from '../utils/contractConfig';
import { Button, Stack, CircularProgress, Typography } from '@mui/material';
import { SwapHoriz, Pool } from '@mui/icons-material';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { useMainConfig } from '../utils/contractConfig';
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
  const { USDC, Insurance, UniswapV2Router02 } = useMainConfig();
  const { AAA, AA } = useTranchesConfig();

  const [selectedFromToken, setSelectedFromToken] = useState('');
  const [selectedToToken, setSelectedToToken] = useState('');
  const [selectedLiquidityToken, setSelectedLiquidityToken] = useState('');

  const { data: fromTokenDecimals = 6 } = useReadContract({
    address: selectedFromToken,
    abi: ['function decimals() view returns (uint8)'],
    functionName: 'decimals',
    enabled: Boolean(selectedFromToken),
  });

  const { data: toTokenDecimals = 6 } = useReadContract({
    address: selectedToToken,
    abi: ['function decimals() view returns (uint8)'],
    functionName: 'decimals',
    enabled: Boolean(selectedToToken),
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

  const { data: toTokenBalance = 0n } = useReadContract({
    address: selectedToToken,
    abi: ['function balanceOf(address) view returns (uint256)'],
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && selectedToToken && isConnected),
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

  const { data: usdcBalance = 0n } = useReadContract({
    address: USDC?.address,
    abi: USDC?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && USDC && isConnected),
  });

  const { data: fromTokenAllowance = 0n, refetch: refetchFromTokenAllowance } = useReadContract({
    address: selectedFromToken,
    abi: ['function allowance(address,address) view returns (uint256)'],
    functionName: 'allowance',
    args: [address, UniswapV2Router02?.address],
    enabled: Boolean(address && selectedFromToken && UniswapV2Router02 && isConnected),
  });

  const { data: toTokenAllowance = 0n, refetch: refetchToTokenAllowance } = useReadContract({
    address: selectedToToken,
    abi: ['function allowance(address,address) view returns (uint256)'],
    functionName: 'allowance',
    args: [address, UniswapV2Router02?.address],
    enabled: Boolean(address && selectedToToken && UniswapV2Router02 && isConnected),
  });

  const { data: liquidityTokenAllowance = 0n, refetch: refetchLiquidityTokenAllowance } = useReadContract({
    address: selectedLiquidityToken,
    abi: ['function allowance(address,address) view returns (uint256)'],
    functionName: 'allowance',
    args: [address, UniswapV2Router02?.address],
    enabled: Boolean(address && selectedLiquidityToken && UniswapV2Router02 && isConnected),
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
      onSuccess: () => {
        refetchLiquidityTokenAllowance();
        refetchUSDCAllowance();
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
        // First approve the selected token
        const approveTokenHash = await writeContractAsync({
          address: selectedLiquidityToken,
          abi: selectedLiquidityToken === USDC?.address ? USDC?.abi : AAA?.abi,
          functionName: 'approve',
          args: [UniswapV2Router02.address, liquidityAmountInWei]
        });
        console.log('Approve token hash:', approveTokenHash);

        // Wait for token approval to be mined
        await refetchLiquidityTokenAllowance();

        // Then approve USDC
        const approveUSDCHash = await writeContractAsync({
          address: USDC.address,
          abi: USDC.abi,
          functionName: 'approve',
          args: [UniswapV2Router02.address, liquidityAmountInWei]
        });
        console.log('Approve USDC hash:', approveUSDCHash);

        // Wait for USDC approval to be mined
        await refetchUSDCAllowance();

        // Return both hashes to track both transactions
        return { approveTokenHash, approveUSDCHash };
      } catch (err) {
        console.error('Approval error:', err);
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
    <>
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
      </ContentCard>

      <ContentCard title="Add Liquidity" sx={{ mt: 3 }}>
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
              USDC Balance: {formatUnits(usdcBalance, 6)} USDC  {/* USDC is always 6 decimals */}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              USDC Allowance: {formatUnits(usdcAllowance, 6)} USDC  {/* USDC is always 6 decimals */}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              You will need to deposit equal amounts of tokens and USDC to provide liquidity
            </Typography>
          </div>

          <Stack direction="row" spacing={2}>
            <Button
              fullWidth
              variant={(liquidityAmountInWei > liquidityTokenAllowance || liquidityAmountInWei > usdcAllowance) ? "contained" : "outlined"}
              onClick={handleApproveLiquidityClick}
              disabled={!liquidityAmount || !selectedLiquidityToken || isApprovingLiquidity || !validateLiquidityAmount(liquidityAmount) || (liquidityAmountInWei <= liquidityTokenAllowance && liquidityAmountInWei <= usdcAllowance)}
              startIcon={isApprovingLiquidity ? <CircularProgress size={24} /> : <Pool />}
              color="primary"
            >
              1. Approve Tokens
            </Button>
            <Button
              fullWidth
              variant={(liquidityAmountInWei <= liquidityTokenAllowance && liquidityAmountInWei <= usdcAllowance) ? "contained" : "outlined"}
              onClick={handleAddLiquidity}
              disabled={!liquidityAmount || !selectedLiquidityToken || isAddingLiquidity || liquidityAmountInWei > liquidityTokenAllowance || liquidityAmountInWei > usdcAllowance}
              startIcon={isAddingLiquidity ? <CircularProgress size={24} /> : <Pool />}
              color="primary"
            >
              2. Add Liquidity
            </Button>
          </Stack>
        </Stack>
      </ContentCard>
    </>
  );
};

export default Trade;
