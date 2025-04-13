import React, { useState, useEffect } from 'react';
import { Button, Stack, CircularProgress, Typography, Box } from '@mui/material';
import { AccountBalance } from '@mui/icons-material';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { useMainConfig, useTranchesConfig } from '../utils/contractConfig';
import { useWriteContract, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { useTransaction } from '../utils/useTransaction';
import { useAmountForm } from '../utils/useAmountForm';
import {
  ContentCard,
  TransactionAlerts,
  InfoBox,
  AmountField
} from '../components/ui';

const WalletRequiredPrompt = ({ openConnectModal }) => (
  <ContentCard title="Connect Wallet to Withdraw">
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
  const { data: trancheABalance = 0n, isLoading: isLoadingBalanceA, refetch: refetchBalanceA } = useReadContract({
    address: tranches.A?.address,
    abi: tranches.A?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && tranches.A && isConnected),
  });

  const { data: trancheBBalance = 0n, isLoading: isLoadingBalanceB, refetch: refetchBalanceB } = useReadContract({
    address: tranches.B?.address,
    abi: tranches.B?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && tranches.B && isConnected),
  });

  const { data: trancheCBalance = 0n, isLoading: isLoadingBalanceC, refetch: refetchBalanceC } = useReadContract({
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
    validateAmount,
    reset: resetAmount,
    amountInWei
  } = useAmountForm(totalBalance);

  // Track when to update balances
  const [shouldUpdateBalances, setShouldUpdateBalances] = useState(false);

  const { isProcessing: isWithdrawing, error: withdrawError, success: withdrawSuccess, handleTransaction: handleWithdraw } =
    useTransaction({
      onSuccess: () => {
        resetAmount();
        setShouldUpdateBalances(true);
      }
    });

  // Effect to update balances after transaction is confirmed
  useEffect(() => {
    if (withdrawSuccess && shouldUpdateBalances) {
      // Update balances only after transaction is confirmed
      refetchBalanceA();
      refetchBalanceB();
      refetchBalanceC();
      setShouldUpdateBalances(false);
    }
  }, [withdrawSuccess, shouldUpdateBalances, refetchBalanceA, refetchBalanceB, refetchBalanceC]);

  const { writeContractAsync } = useWriteContract();

  const handleWithdrawClick = () => {
    handleWithdraw(async () => {
      try {
        const individualAmount = amountInWei / 3n;
        const hash = await writeContractAsync({
          address: Insurance.address,
          abi: Insurance.abi,
          functionName: 'claim',
          args: [individualAmount, individualAmount, individualAmount],
        });
        console.log('Withdraw hash:', hash);
        return hash;
      } catch (err) {
        console.error('Withdraw error:', err);
        throw err;
      }
    });
  };

  if (!isConnected) {
    return <WalletRequiredPrompt openConnectModal={openConnectModal} />;
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
    <ContentCard title="Withdraw USDC">
      <TransactionAlerts
        error={amountError || withdrawError}
        success={withdrawSuccess}
      />

      <Stack spacing={3}>
        <Box>
          <InfoBox title="Available in Tranches" items={balanceItems} />
          <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600, mt: 2, mb: 3 }}>
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
        </Box>

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
          color="primary"
        >
          Withdraw
        </Button>
      </Stack>

      <Box sx={{ mt: 4 }}>
        <InfoBox title="What happens when you withdraw?" items={infoItems} />
      </Box>
    </ContentCard>
  );
};

export default Withdraw;
