import React, { useState, useEffect } from 'react';
import { Button, Stack, CircularProgress, Typography, Box, Alert, Chip } from '@mui/material';
import { AccountBalance, AccessTime, Info } from '@mui/icons-material';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { useMainConfig, useTranchesConfig } from '../utils/contractConfig';
import { useWriteContract, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { useTransaction } from '../utils/useTransaction';
import { useAmountForm } from '../utils/useAmountForm';
import { useProtocolStatus } from '../utils/contracts';
import {
  ContentCard,
  TransactionAlerts,
  InfoBox,
  AmountField
} from '../components/ui';

const WalletRequiredPrompt = ({ openConnectModal }: { openConnectModal: () => void }) => (
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
  const protocolStatus = useProtocolStatus();

  // Get withdrawal start time
  const { data: withdrawalStart } = useReadContract({
    address: Insurance?.address as `0x${string}`,
    abi: Insurance?.abi,
    functionName: 'T2',
    query: { enabled: Boolean(Insurance) },
  });


  // Read balances for each tranche
  const { data: trancheAAABalance = 0n, isLoading: isLoadingBalanceAAA, refetch: refetchBalanceAAA } = useReadContract({
    address: tranches.AAA?.address as `0x${string}`,
    abi: tranches.AAA?.abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { enabled: Boolean(address && tranches.AAA && isConnected) },
  });

  const { data: trancheAABalance = 0n, isLoading: isLoadingBalanceAA, refetch: refetchBalanceAA } = useReadContract({
    address: tranches.AA?.address as `0x${string}`,
    abi: tranches.AA?.abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { enabled: Boolean(address && tranches.AA && isConnected) },
  });

  const isLoadingBalances = isLoadingBalanceAAA || isLoadingBalanceAA;
  const totalBalance = (trancheAAABalance as bigint) + (trancheAABalance as bigint);

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
      refetchBalanceAAA();
      refetchBalanceAA();
      setShouldUpdateBalances(false);
    }
  }, [withdrawSuccess, shouldUpdateBalances, refetchBalanceAAA, refetchBalanceAA]);

  const { writeContractAsync } = useWriteContract();

  const handleWithdrawClick = () => {
    handleWithdraw(async () => {
      try {
        const individualAmount = amountInWei / 2n; // Split between AAA and AA
        const hash = await writeContractAsync({
          address: Insurance.address as `0x${string}`,
          abi: Insurance.abi,
          functionName: 'claim',
          args: [individualAmount, individualAmount],
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
    `Tranche AAA: $${isLoadingBalanceAAA ? 'Loading...' : formatUnits(trancheAAABalance as bigint, 18)}`,
    `Tranche AA: $${isLoadingBalanceAA ? 'Loading...' : formatUnits(trancheAABalance as bigint, 18)}`
  ];

  const infoItems = [
    'Equal amounts are withdrawn from both tranches (AAA and AA)',
    'Your tranche tokens are burned and you receive USDC in return',
    'USDC is withdrawn proportionally from Aave and Moonwell',
    'The amount must be divisible by 2 to ensure equal withdrawal from tranches',
  ];

  // Check if withdrawals are currently allowed
  const isWithdrawalPhase = protocolStatus.status.includes('Withdrawal');
  const isDepositPhase = protocolStatus.status.includes('Deposit');
  const isInsurancePhase = protocolStatus.status.includes('Insurance');

  const getPhaseColor = () => {
    if (isWithdrawalPhase) return 'success';
    if (isInsurancePhase) return 'warning';
    return 'info';
  };

  const getTimeUntilWithdrawal = () => {
    const now = new Date();
    const withdrawalStart = protocolStatus.phases.withdrawal.start;

    if (now >= withdrawalStart) {
      return null; // Already in withdrawal phase
    }

    const diff = withdrawalStart.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const timeUntilWithdrawal = getTimeUntilWithdrawal();

  return (
    <ContentCard title="Withdraw USDC">
      <TransactionAlerts
        error={amountError || withdrawError}
        success={withdrawSuccess}
      />

      {/* Phase Status Alert */}
      <Alert
        severity={isWithdrawalPhase ? 'success' : 'info'}
        icon={<AccessTime />}
        sx={{ mb: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Current Phase:
          </Typography>
          <Chip
            label={protocolStatus.status}
            color={getPhaseColor()}
            size="small"
            variant="outlined"
          />
        </Box>

        {isWithdrawalPhase ? (
          <Typography variant="body2">
            ✅ Withdrawals are currently enabled! You can withdraw your funds until {protocolStatus.phases.withdrawal.end.toLocaleDateString()}.
          </Typography>
        ) : (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              ⏳ Withdrawals are not yet available.
              {timeUntilWithdrawal && ` Withdrawal phase starts in ${timeUntilWithdrawal}.`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Withdrawal phase: {protocolStatus.phases.withdrawal.start.toLocaleDateString()} - {protocolStatus.phases.withdrawal.end.toLocaleDateString()}
            </Typography>
          </Box>
        )}
      </Alert>

      <Stack spacing={3}>
        <Box>
          <InfoBox title="Available in Tranches" items={balanceItems} />
          <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600, mt: 2, mb: 3 }}>
            Total Available to Withdraw: {isLoadingBalances ? 'Loading...' : formatUnits(totalBalance as bigint, 18)} USDC
          </Typography>

          <AmountField
            amount={amount}
            setAmount={handleAmountChange}
            validateAmount={validateAmount}
            setError={setError}
            maxAmount={Number(formatUnits(totalBalance, 18))}
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
            amountInWei / 2n > (trancheAAABalance as bigint) ||
            amountInWei / 2n > (trancheAABalance as bigint) ||
            !isWithdrawalPhase
          }
          startIcon={isWithdrawing ? <CircularProgress size={24} /> : <AccountBalance />}
          color={isWithdrawalPhase ? "primary" : "inherit"}
          sx={{
            opacity: isWithdrawalPhase ? 1 : 0.6,
            cursor: isWithdrawalPhase ? 'pointer' : 'not-allowed'
          }}
        >
          {isWithdrawing
            ? 'Processing...'
            : isWithdrawalPhase
              ? 'Withdraw'
              : `Withdraw (Available ${protocolStatus.phases.withdrawal.start.toLocaleDateString()})`
          }
        </Button>

        {!isWithdrawalPhase && (
          <Alert severity="warning" icon={<Info />}>
            <Typography variant="body2">
              <strong>Why can't I withdraw now?</strong><br />
              The protocol operates in phases to ensure security and proper risk management:
              <br />• <strong>Deposit Phase</strong>: Users can deposit funds
              <br />• <strong>Insurance Phase</strong>: Funds are actively providing insurance coverage
              <br />• <strong>Withdrawal Phase</strong>: Users can withdraw their funds and any earned rewards
            </Typography>
          </Alert>
        )}
      </Stack>

      <Box sx={{ mt: 4 }}>
        <InfoBox title="What happens when you withdraw?" items={infoItems} />
      </Box>
    </ContentCard>
  );
};

export default Withdraw;
