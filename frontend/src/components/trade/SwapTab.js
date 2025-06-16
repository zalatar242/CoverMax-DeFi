import React, { useState } from 'react';
import { Button, Stack, CircularProgress, Typography } from '@mui/material';
import { SwapHoriz } from '@mui/icons-material';
import { useWalletConnection } from '../../utils/walletConnector';
import { useMainConfig, useTranchesConfig } from '../../utils/contractConfig';
import { useWriteContract, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { useTransaction } from '../../utils/useTransaction';
import { useAmountForm } from '../../utils/useAmountForm';
import {
  ContentCard,
  AmountField,
  TransactionAlerts,
  TokenSelect
} from '../ui';

const SwapTab = () => {
  const { isConnected, address } = useWalletConnection();
  const { USDC, UniswapV2Router02 } = useMainConfig();
  const { AAA, AA } = useTranchesConfig();

  const [selectedFromToken, setSelectedFromToken] = useState('');
  const [selectedToToken, setSelectedToToken] = useState('');

  const { data: fromTokenDecimals = 6 } = useReadContract({
    address: selectedFromToken,
    abi: ['function decimals() view returns (uint8)'],
    functionName: 'decimals',
    enabled: Boolean(selectedFromToken),
  });

  const { data: fromTokenBalance = 0n } = useReadContract({
    address: selectedFromToken,
    abi: ['function balanceOf(address) view returns (uint256)'],
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && selectedFromToken && isConnected),
  });

  const { data: toTokenBalance = 0n, refetch: refetchToTokenBalance } = useReadContract({
    address: selectedToToken,
    abi: ['function balanceOf(address) view returns (uint256)'],
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && selectedToToken && isConnected),
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

  const { data: fromTokenAllowance = 0n, refetch: refetchFromTokenAllowance } = useReadContract({
    address: selectedFromToken,
    abi: selectedFromToken === USDC?.address ? USDC?.abi : AAA?.abi,
    functionName: 'allowance',
    args: [address, UniswapV2Router02?.address],
    enabled: Boolean(address && selectedFromToken && UniswapV2Router02 && isConnected),
  });

  const { refetch: refetchToTokenAllowance } = useReadContract({
    address: selectedToToken,
    abi: selectedToToken === USDC?.address ? USDC?.abi : AAA?.abi, // ABI might differ
    functionName: 'allowance',
    args: [address, UniswapV2Router02?.address],
    enabled: Boolean(address && selectedToToken && UniswapV2Router02 && isConnected),
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
        if (selectedFromToken) {
          // Re-trigger balance fetch for the 'from' token
          const fromTokenConfig = trancheTokens.find(t => t.address === selectedFromToken);
          if (fromTokenConfig) {
            // This is a bit of a hack, ideally useReadContract's refetch would be sufficient
            // For now, let's assume direct refetch works or balances update via watch elsewhere.
            // A more robust way would be to call the specific refetch function from useReadContract
            // e.g., by storing them:
            // const { data: fromTokenBalance, refetch: refetchFromBalance } = useReadContract(...);
            // then call refetchFromBalance();
          }
        }
        if (selectedToToken) {
          refetchToTokenBalance(); // Refetch 'to' token balance
          refetchToTokenAllowance(); // Also refetch 'to' token allowance if needed for future operations
        }
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
          abi: selectedFromToken === USDC?.address ? USDC?.abi : AAA?.abi,
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

  const trancheTokens = [
    { address: AAA?.address, symbol: 'AAA' },
    { address: AA?.address, symbol: 'AA' },
    { address: USDC?.address, symbol: 'USDC' }
  ].filter(token => token.address);

  return (
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
            maxAmount={Number(formatUnits(fromTokenBalance, fromTokenDecimals))}
            label="Amount to Swap"
          />
          {/* Display To Token Balance (Optional) */}
          {/* <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            To Token Balance: {formatUnits(toTokenBalance, selectedToToken === USDC?.address ? 6 : (trancheTokens.find(t => t.address === selectedToToken)?.decimals || 18))} {trancheTokens.find(t => t.address === selectedToToken)?.symbol}
          </Typography> */}
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, mb: 1 }}>
            Your Balance: {formatUnits(fromTokenBalance, fromTokenDecimals)} {trancheTokens.find(t => t.address === selectedFromToken)?.symbol}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Your Allowance: {formatUnits(fromTokenAllowance, fromTokenDecimals)} {trancheTokens.find(t => t.address === selectedFromToken)?.symbol}
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
  );
};

export default SwapTab;
