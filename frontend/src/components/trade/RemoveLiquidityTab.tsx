import React from 'react';
import { Button, Stack, CircularProgress, Typography } from '@mui/material';
import { Remove } from '@mui/icons-material';
import { useWalletConnection } from '../../utils/walletConnector';
import { useMainConfig, useTranchesConfig, useContractsConfig } from '../../utils/contractConfig';
import { formatUnits } from 'viem';
import { useLiquidityLogic } from '../../hooks/useLiquidityLogic';
import {
  ContentCard,
  AmountField,
  TransactionAlerts,
  TokenSelect
} from '../ui';

interface RemoveLiquidityTabProps {
  onTransactionSuccess?: () => void;
}

const RemoveLiquidityTab: React.FC<RemoveLiquidityTabProps> = ({ onTransactionSuccess }) => {
  const { isConnected, address } = useWalletConnection();
  const { USDC, UniswapV2Router02 } = useMainConfig();
  const { AAA, AA } = useTranchesConfig();
  const contracts = useContractsConfig();
  const UniswapV2Factory = contracts?.UniswapV2Factory;

  const trancheTokens = [
    { address: AAA?.address, symbol: 'AAA' },
    { address: AA?.address, symbol: 'AA' },
  ].filter(token => token.address);

  const liquidityLogic = useLiquidityLogic({
    userAddress: address,
    routerConfig: UniswapV2Router02,
    factoryConfig: UniswapV2Factory,
    usdcConfig: USDC,
    onTransactionSuccess
  });

  const {
    selectedToken,
    setSelectedToken,
    lpAllowance,
    formattedLPBalance,
    formattedLPAllowance,
    liquidityAmount,
    liquidityAmountError,
    setLiquidityError,
    handleLiquidityAmountChange,
    validateLiquidityAmount,
    handleApprove,
    handleRemoveLiquidity,
    isApproving,
    isRemoving,
    needsApproval,
    canApprove,
    canRemove,
    approveError,
    removeError,
    approveSuccess,
    removeSuccess
  } = liquidityLogic;

  const tokenSymbol = trancheTokens.find(t => t.address === selectedToken)?.symbol || '';

  return (
    <ContentCard title="Remove Liquidity (Token/USDC)">
      <TransactionAlerts
        error={liquidityAmountError || removeError || approveError}
        success={removeSuccess || approveSuccess}
      />
      <Stack spacing={3}>
        <div>
          <TokenSelect
            token={selectedToken}
            onTokenChange={setSelectedToken}
            tokens={trancheTokens}
            label="Select Token from Pool"
          />
          <AmountField
            amount={liquidityAmount}
            setAmount={handleLiquidityAmountChange}
            setError={setLiquidityError}
            maxAmount={Number(formattedLPBalance)}
            label="Amount of LP Tokens to Remove"
          />
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, mb: 1 }}>
            Your LP Token Balance: {Number(formattedLPBalance).toLocaleString(undefined, { maximumFractionDigits: 6 })}
            {' '}({tokenSymbol}/USDC LP)
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Your LP Token Allowance: {Number(formattedLPAllowance).toLocaleString(undefined, { maximumFractionDigits: 6 })}
          </Typography>
        </div>

        <Stack direction="row" spacing={2}>
          <Button
            fullWidth
            variant={needsApproval && canApprove ? "contained" : "outlined"}
            onClick={handleApprove}
            disabled={!canApprove}
            startIcon={isApproving ? <CircularProgress size={24} /> : <Remove />}
            color="primary"
          >
            1. Approve LP Tokens
          </Button>
          <Button
            fullWidth
            variant={canRemove ? "contained" : "outlined"}
            onClick={handleRemoveLiquidity}
            disabled={!canRemove}
            startIcon={isRemoving ? <CircularProgress size={24} /> : <Remove />}
            color="primary"
          >
            2. Remove Liquidity
          </Button>
        </Stack>
      </Stack>
    </ContentCard>
  );
};

export default RemoveLiquidityTab;
