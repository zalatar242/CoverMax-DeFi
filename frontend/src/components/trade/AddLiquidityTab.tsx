import React from 'react';
import { Button, Stack, CircularProgress, Typography } from '@mui/material';
import { Pool } from '@mui/icons-material';
import { useWalletConnection } from '../../utils/walletConnector';
import { useMainConfig, useTranchesConfig } from '../../utils/contractConfig';
import { formatUnits } from 'viem';
import { useAddLiquidityLogic } from '../../hooks/useAddLiquidityLogic';
import {
  ContentCard,
  AmountField,
  TransactionAlerts,
  TokenSelect
} from '../ui';

interface AddLiquidityTabProps {
  onTransactionSuccess?: () => void;
}

const AddLiquidityTab: React.FC<AddLiquidityTabProps> = ({ onTransactionSuccess }) => {
  const { isConnected, address } = useWalletConnection();
  const { USDC, UniswapV2Router02 } = useMainConfig();
  const { AAA, AA } = useTranchesConfig();

  const trancheTokens = [
    { address: AAA?.address, symbol: 'AAA', abi: AAA?.abi, decimals: AAA?.decimals },
    { address: AA?.address, symbol: 'AA', abi: AA?.abi, decimals: AA?.decimals },
  ].filter(token => token.address);

  const liquidityLogic = useAddLiquidityLogic({
    userAddress: address,
    routerConfig: UniswapV2Router02,
    usdcConfig: USDC,
    onTransactionSuccess
  });

  const {
    selectedToken,
    setSelectedToken,
    selectedTokenData,
    usdcTokenData,
    liquidityAmount,
    liquidityAmountError,
    setLiquidityError,
    handleLiquidityAmountChange,
    validateLiquidityAmount,
    maxAmount,
    handleApprove,
    handleAddLiquidity,
    isApproving,
    isAdding,
    needsApproval,
    canApprove,
    canAdd,
    approveError,
    addError,
    approveSuccess,
    addSuccess
  } = liquidityLogic;

  const tokenSymbol = trancheTokens.find(t => t.address === selectedToken)?.symbol || '';

  return (
    <ContentCard title="Add Liquidity (Token/USDC)">
      <TransactionAlerts
        error={liquidityAmountError || approveError || addError}
        success={approveSuccess || addSuccess}
      />

      <Stack spacing={3}>
        <div>
          <TokenSelect
            token={selectedToken}
            onTokenChange={setSelectedToken}
            tokens={trancheTokens}
            label="Select Token"
          />
          <AmountField
            amount={liquidityAmount}
            setAmount={handleLiquidityAmountChange}
            setError={setLiquidityError}
            maxAmount={maxAmount}
            label="Amount of Token to Deposit"
          />
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, mb: 2 }}>
            (An equivalent amount of USDC will be required)
          </Typography>

          {selectedTokenData && (
            <>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0, mb: 1 }}>
                Your Token Balance: {formatUnits(selectedTokenData.balance as bigint, selectedTokenData.decimals as number)} {tokenSymbol}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                Your Token Allowance: {formatUnits(selectedTokenData.allowance as bigint, selectedTokenData.decimals as number)} {tokenSymbol}
              </Typography>
            </>
          )}

          {usdcTokenData && (
            <>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                Your USDC Balance: {formatUnits(usdcTokenData.balance as bigint, usdcTokenData.decimals as number)} USDC
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Your USDC Allowance: {formatUnits(usdcTokenData.allowance as bigint, usdcTokenData.decimals as number)} USDC
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
            startIcon={isApproving ? <CircularProgress size={24} /> : <Pool />}
            color="primary"
          >
            1. Approve Tokens
          </Button>
          <Button
            fullWidth
            variant={canAdd ? "contained" : "outlined"}
            onClick={handleAddLiquidity}
            disabled={!canAdd}
            startIcon={isAdding ? <CircularProgress size={24} /> : <Pool />}
            color="primary"
          >
            2. Add Liquidity
          </Button>
        </Stack>
      </Stack>
    </ContentCard>
  );
};

export default AddLiquidityTab;
