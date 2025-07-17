import React from 'react';
import { Button, Stack, CircularProgress, Typography } from '@mui/material';
import { Remove } from '@mui/icons-material';
import { useWalletConnection } from '../../utils/walletConnector';
import { useTranchesConfig, useContractsConfig } from '../../utils/contractConfig';
import { formatUnits } from 'viem';
import { useRemoveLiquidityLogicAAA } from '../../hooks/useRemoveLiquidityLogicAAA';
import {
  ContentCard,
  AmountField,
  TransactionAlerts
} from '../ui';

interface RemoveLiquidityTabProps {
  onTransactionSuccess?: () => void;
}

const RemoveLiquidityTab: React.FC<RemoveLiquidityTabProps> = ({ onTransactionSuccess }) => {
  const { isConnected, address } = useWalletConnection();
  const { AAA, AA } = useTranchesConfig();
  const contracts = useContractsConfig();
  const UniswapV2Router02 = contracts?.UniswapV2Router02;
  const UniswapV2Factory = contracts?.UniswapV2Factory;

  const liquidityLogic = useRemoveLiquidityLogicAAA({
    userAddress: address,
    routerConfig: UniswapV2Router02,
    factoryConfig: UniswapV2Factory,
    tokenAConfig: AAA,
    tokenBConfig: AA,
    onTransactionSuccess
  });

  const {
    formattedLPBalance,
    formattedLPAllowance,
    liquidityAmount,
    liquidityAmountError,
    setLiquidityError,
    handleLiquidityAmountChange,
    maxAmount,
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

  return (
    <ContentCard title="Remove Liquidity (AAA/AA Pool)">
      <TransactionAlerts
        error={liquidityAmountError || removeError || approveError}
        success={removeSuccess || approveSuccess}
      />
      <Stack spacing={3}>
        <div>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Remove Liquidity from AAA/AA Pool
          </Typography>
          <AmountField
            amount={liquidityAmount}
            setAmount={handleLiquidityAmountChange}
            setError={setLiquidityError}
            maxAmount={maxAmount}
            label="Amount of LP Tokens to Remove"
          />
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, mb: 1 }}>
            Your LP Token Balance: {Number(formattedLPBalance).toLocaleString(undefined, { maximumFractionDigits: 6 })}
            {' '}AAA/AA LP
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Your LP Token Allowance: {Number(formattedLPAllowance).toLocaleString(undefined, { maximumFractionDigits: 6 })}
            {' '}AAA/AA LP
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
