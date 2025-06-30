import React from 'react';
import { Button, Stack, CircularProgress, Typography, Box } from '@mui/material';
import { AccountBalance, CheckCircle } from '@mui/icons-material';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { useUSDCBalance, usePortfolioData } from '../utils/contracts';
import { useMainConfig } from '../utils/contractConfig';
import { useWriteContract, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { useTransaction } from '../utils/useTransaction';
import { useAmountForm } from '../utils/useAmountForm';

import {
  ContentCard,
  AmountField,
  TransactionAlerts,
  InfoBox
} from '../components/ui';

const WalletRequiredPrompt = ({ openConnectModal }: { openConnectModal: () => void }) => (
  <ContentCard title="Connect Wallet to Deposit">
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

const Deposit = () => {
  const { isConnected, address } = useWalletConnection();
  const { openConnectModal } = useWalletModal();
  const { balance, isLoading: isLoadingBalance, refetch: refetchBalance } = useUSDCBalance();
  const { USDC, Insurance } = useMainConfig();
  const { refetch: refetchTrancheBalances } = usePortfolioData();

  const {
    amount,
    error: amountError,
    setError,
    handleAmountChange,
    validateAmount,
    reset: resetAmount,
    amountInWei
  } = useAmountForm(balance as bigint);

  const { isProcessing: isApproving, error: approveError, success: approveSuccess, handleTransaction: handleApprove } =
    useTransaction({
      onSuccess: () => {
        refetchAllowance();
        refetchBalance();
      }
    });

  const { isProcessing: isDepositing, error: depositError, success: depositSuccess, handleTransaction: handleDeposit } =
    useTransaction({
      onSuccess: () => {
        resetAmount();
        refetchBalance();
        refetchAllowance();
        refetchTrancheBalances();
      }
    });

  const { data: allowance = 0n, refetch: refetchAllowance } = useReadContract({
    address: USDC?.address as `0x${string}`,
    abi: USDC?.abi,
    functionName: 'allowance',
    args: [address as `0x${string}`, Insurance?.address as `0x${string}`],
    query: { enabled: Boolean(address && USDC && Insurance && isConnected) },
  });

  const { writeContractAsync } = useWriteContract();

  const handleApproveClick = () => {
    handleApprove(async () => {
      try {
        const hash = await writeContractAsync({
          address: USDC.address as `0x${string}`,
          abi: USDC.abi,
          functionName: 'approve',
          args: [Insurance.address as `0x${string}`, amountInWei]
        });
        console.log('Approve hash:', hash);
        await refetchAllowance();
        return hash;
      } catch (err) {
        console.error('Approval error:', err);
        throw err;
      }
    });
  };

  const handleDepositClick = () => {
    handleDeposit(async () => {
      try {
        const hash = await writeContractAsync({
          address: Insurance.address as `0x${string}`,
          abi: Insurance.abi,
          functionName: 'splitRisk',
          args: [amountInWei]
        });
        console.log('Deposit hash:', hash);
        resetAmount();
        return hash;
      } catch (err) {
        console.error('Deposit error:', err);
        throw err;
      }
    });
  };

  if (!isConnected) {
    return <WalletRequiredPrompt openConnectModal={openConnectModal} />;
  }

  const infoItems = [
    'Your deposit is split equally between AAA and AA tranches, so amount must be even',
    'Deposits are automatically split across Aave and Moonwell lending protocols to reduce platform risk',
    'Each protocol has been audited and battle-tested in DeFi for optimal security',
    'You\'ll receive two tranche tokens (AAA, AA) representing different risk levels',
  ];

  return (
    <ContentCard title="Deposit USDC">
      <TransactionAlerts
        error={amountError || approveError || depositError}
        success={approveSuccess || depositSuccess}
      />

      <Stack spacing={3}>
        <div>
          <AmountField
            amount={amount}
            setAmount={handleAmountChange}
            validateAmount={validateAmount}
            setError={setError}
            maxAmount={Number(formatUnits(balance as bigint, 6))}
            label="Amount to Deposit"
          />
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            Available Balance: {isLoadingBalance ? 'Loading...' : formatUnits(balance as bigint, 6)} USDC
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Current Allowance: {formatUnits(allowance as bigint, 6)} USDC
          </Typography>
        </div>

        <Stack direction="row" spacing={2}>
          <Button
            fullWidth
            variant={amountInWei > (allowance as bigint) ? "contained" : "outlined"}
            onClick={handleApproveClick}
            disabled={!amount || isApproving || !validateAmount(amount) || amountInWei <= (allowance as bigint)}
            startIcon={isApproving ? <CircularProgress size={24} /> : <CheckCircle />}
            color="primary"
          >
            1. Approve USDC
          </Button>
          <Button
            fullWidth
            variant={amountInWei <= (allowance as bigint) ? "contained" : "outlined"}
            onClick={handleDepositClick}
            disabled={!amount || isDepositing || amountInWei > (allowance as bigint)}
            startIcon={isDepositing ? <CircularProgress size={24} /> : <AccountBalance />}
            color="primary"
          >
            2. Deposit
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ mt: 4 }}>
        <InfoBox title="Understanding Your Deposit" items={infoItems} />
      </Box>
    </ContentCard>
  );
};

export default Deposit;
