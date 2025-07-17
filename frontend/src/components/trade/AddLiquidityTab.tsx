import React from 'react';
import { Button, Stack, CircularProgress, Typography } from '@mui/material';
import { Pool } from '@mui/icons-material';
import { useWalletConnection } from '../../utils/walletConnector';
import { useMainConfig, useTranchesConfig } from '../../utils/contractConfig';
import { formatUnits } from 'viem';
import { useAddLiquidityLogicAAA } from '../../hooks/useAddLiquidityLogicAAA';
import {
  ContentCard,
  AmountField,
  TransactionAlerts
} from '../ui';

interface AddLiquidityTabProps {
  onTransactionSuccess?: () => void;
}

const AddLiquidityTab: React.FC<AddLiquidityTabProps> = ({ onTransactionSuccess }) => {
  const { isConnected, address } = useWalletConnection();
  const { UniswapV2Router02 } = useMainConfig();
  const { AAA, AA } = useTranchesConfig();

  const liquidityLogic = useAddLiquidityLogicAAA({
    userAddress: address,
    routerConfig: UniswapV2Router02,
    tokenAConfig: AAA,
    tokenBConfig: AA,
    onTransactionSuccess
  });

  const {
    tokenAData,
    tokenBData,
    amountA,
    amountAError,
    setAmountAError,
    handleAmountAChange,
    maxAmountA,
    amountB,
    amountBError,
    setAmountBError,
    maxAmountB,
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

  return (
    <ContentCard title="Add Liquidity (AAA/AA Pool)">
      <TransactionAlerts
        error={amountAError || amountBError || approveError || addError}
        success={approveSuccess || addSuccess}
      />

      <Stack spacing={3}>
        <div>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Add Liquidity Amount
          </Typography>
          <AmountField
            amount={amountA}
            setAmount={handleAmountAChange}
            setError={setAmountAError}
            maxAmount={maxAmountA}
            label="Amount of AAA to Deposit"
          />

          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, mb: 2 }}>
            {amountB && amountA ? (
              `Required AA amount: ${amountB} AA (based on current pool ratio)`
            ) : (
              'Enter AAA amount to see required AA amount'
            )}
          </Typography>

          {tokenAData && tokenBData && (
            <>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, mb: 1 }}>
                Your Balances: {formatUnits(tokenAData.balance as bigint, tokenAData.decimals as number)} AAA, {formatUnits(tokenBData.balance as bigint, tokenBData.decimals as number)} AA
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Your Allowances: {formatUnits(tokenAData.allowance as bigint, tokenAData.decimals as number)} AAA, {formatUnits(tokenBData.allowance as bigint, tokenBData.decimals as number)} AA
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
