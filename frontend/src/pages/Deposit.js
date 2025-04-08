import React from 'react';
import { Button, Stack, CircularProgress, Typography } from '@mui/material';
import { AccountBalance, CheckCircle } from '@mui/icons-material';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { useUSDCBalance } from '../utils/contracts';
import { useMainConfig } from '../utils/contractConfig';
import { useWriteContract, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { useTransaction } from '../utils/useTransaction';
import { useAmountForm } from '../utils/useAmountForm';
import {
  PageContainer,
  ContentCard,
  WalletRequiredCard,
  TransactionAlerts,
  InfoBox,
  AmountField
} from '../components/common';
import { buttonStyles, colors } from '../utils/theme';

const Deposit = () => {
  const { isConnected, address } = useWalletConnection();
  const { openConnectModal } = useWalletModal();
  const { balance, isLoading: isLoadingBalance } = useUSDCBalance();
  const { USDC, Insurance } = useMainConfig();

  const {
    amount,
    error: amountError,
    setError,
    handleAmountChange,
    handleMaxAmount,
    validateAmount,
    reset: resetAmount,
    amountInWei
  } = useAmountForm(balance);

  const { isProcessing: isApproving, error: approveError, success: approveSuccess, handleTransaction: handleApprove } =
    useTransaction({
      onSuccess: () => refetchAllowance()
    });

  const { isProcessing: isDepositing, error: depositError, success: depositSuccess, handleTransaction: handleDeposit } =
    useTransaction({
      onSuccess: () => {
        resetAmount();
      }
    });

  const { data: allowance = 0n, refetch: refetchAllowance } = useReadContract({
    address: USDC?.address,
    abi: USDC?.abi,
    functionName: 'allowance',
    args: [address, Insurance?.address],
    enabled: Boolean(address && USDC && Insurance && isConnected),
  });

  const { writeContract: approveUSDC } = useWriteContract();
  const { writeContract: deposit } = useWriteContract();

  const handleApproveClick = () => {
    handleApprove(async () => {
      approveUSDC({
        address: USDC.address,
        abi: USDC.abi,
        functionName: 'approve',
        args: [Insurance.address, amountInWei],
      });
    });
  };

  const handleDepositClick = () => {
    handleDeposit(async () => {
      deposit({
        address: Insurance.address,
        abi: Insurance.abi,
        functionName: 'splitRisk',
        args: [amountInWei],
      });
    });
  };

  if (!isConnected) {
    return (
      <PageContainer>
        <WalletRequiredCard title="Connect Wallet to Deposit" onConnect={openConnectModal} />
      </PageContainer>
    );
  }

  const infoItems = [
    'Your USDC will be distributed across Aave, Compound, and Moonwell',
    'You\'ll receive tranche tokens (A, B, C) representing your deposit',
    'Each tranche has different risk/reward profiles and withdrawal priorities'
  ];

  return (
    <PageContainer>
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
              maxAmount={Number(formatUnits(balance, 6))}
              label="Amount to Deposit"
            />
            <Typography variant="body2" sx={{ color: colors.textLight, mb: 2 }}>
              Available Balance: {isLoadingBalance ? 'Loading...' : formatUnits(balance, 6)} USDC
            </Typography>
          </div>

          <Stack direction="row" spacing={2}>
            <Button
              fullWidth
              variant={amountInWei > allowance ? "contained" : "outlined"}
              onClick={handleApproveClick}
              disabled={!amount || isApproving || !validateAmount(amount) || amountInWei <= allowance}
              startIcon={isApproving ? <CircularProgress size={24} /> : <CheckCircle />}
              sx={amountInWei > allowance ? buttonStyles.primary : buttonStyles.outlined}
            >
              1. Approve USDC
            </Button>
            <Button
              fullWidth
              variant={amountInWei <= allowance ? "contained" : "outlined"}
              onClick={handleDepositClick}
              disabled={!amount || isDepositing || amountInWei > allowance}
              startIcon={isDepositing ? <CircularProgress size={24} /> : <AccountBalance />}
              sx={amountInWei <= allowance ? buttonStyles.primary : buttonStyles.outlined}
            >
              2. Deposit
            </Button>
          </Stack>
        </Stack>

        <InfoBox title="What happens when you deposit?" items={infoItems} />
      </ContentCard>
    </PageContainer>
  );
};

export default Deposit;
