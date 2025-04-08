import React from 'react';
import { Button, Stack, CircularProgress, Typography } from '@mui/material';
import { AccountBalance } from '@mui/icons-material';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { useMainConfig, useTranchesConfig } from '../utils/contractConfig';
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

const Withdraw = () => {
  const { isConnected, address } = useWalletConnection();
  const { openConnectModal } = useWalletModal();
  const { Insurance } = useMainConfig();
  const tranches = useTranchesConfig();

  // Get withdrawal start time
  const { data: withdrawalStart } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'T2',
    enabled: Boolean(Insurance),
  });

  // Format date for display
  const formattedWithdrawalDate = withdrawalStart
    ? new Date(Number(withdrawalStart) * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Loading...';

  // Read balances for each tranche
  const { data: trancheABalance = 0n, isLoading: isLoadingBalanceA } = useReadContract({
    address: tranches.A?.address,
    abi: tranches.A?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && tranches.A && isConnected),
  });

  const { data: trancheBBalance = 0n, isLoading: isLoadingBalanceB } = useReadContract({
    address: tranches.B?.address,
    abi: tranches.B?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && tranches.B && isConnected),
  });

  const { data: trancheCBalance = 0n, isLoading: isLoadingBalanceC } = useReadContract({
    address: tranches.C?.address,
    abi: tranches.C?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && tranches.C && isConnected),
  });

  const isLoadingBalances = isLoadingBalanceA || isLoadingBalanceB || isLoadingBalanceC;
  const totalBalance = trancheABalance + trancheBBalance + trancheCBalance;

  const {
    amount,
    error: amountError,
    setError,
    handleAmountChange,
    handleMaxAmount,
    validateAmount,
    reset: resetAmount,
    amountInWei
  } = useAmountForm(totalBalance);

  const { isProcessing: isWithdrawing, error: withdrawError, success: withdrawSuccess, handleTransaction: handleWithdraw } =
    useTransaction({
      onSuccess: () => {
        resetAmount();
      }
    });

  const { writeContract: claim } = useWriteContract();

  const handleWithdrawClick = () => {
    handleWithdraw(async () => {
      const individualAmount = amountInWei / 3n;
      claim({
        address: Insurance.address,
        abi: Insurance.abi,
        functionName: 'claim',
        args: [individualAmount, individualAmount, individualAmount],
      });
    });
  };

  if (!isConnected) {
    return (
      <PageContainer>
        <WalletRequiredCard title="Connect Wallet to Withdraw" onConnect={openConnectModal} />
      </PageContainer>
    );
  }

  const balanceItems = [
    `Tranche A: ${isLoadingBalanceA ? 'Loading...' : formatUnits(trancheABalance, 6)} USDC`,
    `Tranche B: ${isLoadingBalanceB ? 'Loading...' : formatUnits(trancheBBalance, 6)} USDC`,
    `Tranche C: ${isLoadingBalanceC ? 'Loading...' : formatUnits(trancheCBalance, 6)} USDC`
  ];

  const infoItems = [
    'Equal amounts are withdrawn from each tranche (A, B, C)',
    'Your tranche tokens are burned and you receive USDC in return',
    'USDC is withdrawn proportionally from Aave, Compound, and Moonwell',
    'The amount must be divisible by 3 to ensure equal withdrawal from tranches',
    `Withdrawals will be enabled starting ${formattedWithdrawalDate}`
  ];

  return (
    <PageContainer>
      <ContentCard title="Withdraw USDC">
        <TransactionAlerts
          error={amountError || withdrawError}
          success={withdrawSuccess}
        />

        <Stack spacing={3}>
          <div>
            <InfoBox title="Available in Tranches" items={balanceItems} />
            <Typography variant="body2" sx={{ color: colors.text, fontWeight: 600, mt: 2, mb: 3 }}>
              Total Available: {isLoadingBalances ? 'Loading...' : formatUnits(totalBalance, 6)} USDC
            </Typography>

            <AmountField
              amount={amount}
              setAmount={handleAmountChange}
              validateAmount={validateAmount}
              setError={setError}
              maxAmount={Number(formatUnits(totalBalance, 6))}
              label="Amount to Withdraw"
            />
          </div>

          <Button
            fullWidth
            variant="contained"
            onClick={handleWithdrawClick}
            disabled={
              !amount ||
              isWithdrawing ||
              !validateAmount(amount) ||
              amountInWei > totalBalance ||
              amountInWei / 3n > trancheABalance ||
              amountInWei / 3n > trancheBBalance ||
              amountInWei / 3n > trancheCBalance
            }
            startIcon={isWithdrawing ? <CircularProgress size={24} /> : <AccountBalance />}
            sx={buttonStyles.primary}
          >
            Withdraw
          </Button>
        </Stack>

        <InfoBox title="What happens when you withdraw?" items={infoItems} />
      </ContentCard>
    </PageContainer>
  );
};

export default Withdraw;
