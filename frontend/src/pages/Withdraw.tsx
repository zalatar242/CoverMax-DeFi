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
    `Tranche AAA: $${isLoadingBalanceAAA ? 'Loading...' : formatUnits(trancheAAABalance as bigint, 6)}`,
    `Tranche AA: $${isLoadingBalanceAA ? 'Loading...' : formatUnits(trancheAABalance as bigint, 6)}`
  ];

  const infoItems = [
    'Equal amounts are withdrawn from both tranches (AAA and AA)',
    'Your tranche tokens are burned and you receive USDC in return',
    'USDC is withdrawn proportionally from Aave and Moonwell',
    'The amount must be divisible by 2 to ensure equal withdrawal from tranches',
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
            Total Available to Withdraw: {isLoadingBalances ? 'Loading...' : formatUnits(totalBalance as bigint, 6)} USDC
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
            amountInWei / 2n > (trancheAAABalance as bigint) ||
            amountInWei / 2n > (trancheAABalance as bigint)
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
