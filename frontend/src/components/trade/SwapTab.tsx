import React, { useEffect } from 'react';
import { Button, Stack, CircularProgress, Typography } from '@mui/material';
import { SwapHoriz } from '@mui/icons-material';
import { useWalletConnection } from '../../utils/walletConnector';
import { useMainConfig, useTranchesConfig } from '../../utils/contractConfig';
import { formatUnits } from 'viem';
import { useMultipleTokenData } from '../../hooks/useTokenData';
import { useSwapLogic } from '../../hooks/useSwapLogic';
import {
  ContentCard,
  AmountField,
  TransactionAlerts,
  TokenSelect
} from '../ui';

interface SwapTabProps {
  onTransactionSuccess?: () => void;
}

const SwapTab: React.FC<SwapTabProps> = ({ onTransactionSuccess }) => {
  const { isConnected, address } = useWalletConnection();
  const { UniswapV2Router02 } = useMainConfig();
  const { AAA, AA } = useTranchesConfig();

  const trancheTokens = [
    { address: AAA?.address, symbol: 'AAA', abi: AAA?.abi, decimals: AAA?.decimals },
    { address: AA?.address, symbol: 'AA', abi: AA?.abi, decimals: AA?.decimals }
  ].filter(token => token.address);

  // Get token data for all tokens
  const tokenData = useMultipleTokenData(trancheTokens, UniswapV2Router02?.address, address);

  // Use swap logic hook
  const swapLogic = useSwapLogic({
    fromTokenData: tokenData,
    toTokenData: tokenData,
    routerConfig: UniswapV2Router02,
    userAddress: address,
    onTransactionSuccess
  });

  const {
    selectedFromToken,
    selectedToToken,
    setSelectedFromToken,
    setSelectedToToken,
    swapAmount,
    swapAmountError,
    setSwapError,
    handleSwapAmountChange,
    validateSwapAmount,
    handleApprove,
    handleSwap,
    isApproving,
    isSwapping,
    needsApproval,
    canApprove,
    canSwap,
    approveError,
    swapError,
    approveSuccess,
    swapSuccess,
    fromToken,
    toToken
  } = swapLogic;

  // Initialize token selection when tokens are available
  useEffect(() => {
    if (trancheTokens.length > 0) {
      const validFromToken = trancheTokens.find(t => t.address?.toLowerCase() === selectedFromToken?.toLowerCase());
      const validToToken = trancheTokens.find(t => t.address?.toLowerCase() === selectedToToken?.toLowerCase());

      // If selected tokens are not valid (e.g., old addresses), reset them
      if (!validFromToken) {
        setSelectedFromToken(trancheTokens[0]?.address || '');
      }
      if (!validToToken || validToToken.address === selectedFromToken) {
        const toTokenIndex = selectedFromToken === trancheTokens[0]?.address ? 1 : 0;
        setSelectedToToken(trancheTokens[toTokenIndex]?.address || '');
      }
    }
  }, [trancheTokens, selectedFromToken, selectedToToken, setSelectedFromToken, setSelectedToToken]);

  const fromTokenInfo = trancheTokens.find(t => t.address?.toLowerCase() === selectedFromToken?.toLowerCase());
  const toTokenInfo = trancheTokens.find(t => t.address?.toLowerCase() === selectedToToken?.toLowerCase());

  return (
    <ContentCard title="Swap Tranches">
      <TransactionAlerts
        error={swapAmountError || approveError || swapError}
        success={approveSuccess || swapSuccess}
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
            setError={setSwapError}
            maxAmount={fromToken ? Number(formatUnits(fromToken.balance, fromToken.decimals)) : 0}
            label="Amount to Swap"
          />

          {fromToken && fromTokenInfo && (
            <>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, mb: 1 }}>
                Your Balance: {formatUnits(fromToken.balance, fromToken.decimals)} {fromTokenInfo.symbol}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Your Allowance: {formatUnits(fromToken.allowance, fromToken.decimals)} {fromTokenInfo.symbol}
              </Typography>
            </>
          )}
        </div>

        <Stack direction="row" spacing={2}>
          <Button
            fullWidth
            variant={needsApproval && canApprove ? "contained" : "outlined"}
            onClick={handleApprove}
            disabled={!canApprove}
            startIcon={isApproving ? <CircularProgress size={24} /> : <SwapHoriz />}
            color="primary"
          >
            1. Approve Token
          </Button>
          <Button
            fullWidth
            variant={canSwap ? "contained" : "outlined"}
            onClick={handleSwap}
            disabled={!canSwap}
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
