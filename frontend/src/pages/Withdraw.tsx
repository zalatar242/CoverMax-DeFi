import React, { useState, useEffect } from 'react';
import { Button, Stack, CircularProgress, Typography, Box } from '@mui/material';
import { AccountBalance } from '@mui/icons-material';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { useMainConfig, useTranchesConfig } from '../utils/contractConfig';
import { useWriteContract, useReadContract } from 'wagmi';
import { formatUnits, type Address } from 'viem';
import { useTransaction } from '../utils/useTransaction';
import { useAmountForm } from '../utils/useAmountForm';
import {
  ContentCard,
  TransactionAlerts,
  InfoBox,
  AmountInput
} from '../components/ui';

interface WalletRequiredPromptProps {
  openConnectModal: () => void;
}

const WalletRequiredPrompt: React.FC<WalletRequiredPromptProps> = ({ openConnectModal }) => (
  <ContentCard title="Connect Wallet to Withdraw" icon={<AccountBalance />}>
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

const Withdraw: React.FC = () => {
  const { isConnected, address } = useWalletConnection();
  const { openConnectModal } = useWalletModal();
  const { Insurance } = useMainConfig();
  const tranches = useTranchesConfig();

  // Get withdrawal start time
  const { data: withdrawalStart } = useReadContract({
    address: Insurance?.address as Address,
    abi: Insurance?.abi,
    functionName: 'T2',
  }) as { data: bigint | undefined };

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
  const { data: trancheAAABalance = 0n, isLoading: isLoadingBalanceAAA, refetch: refetchBalanceAAA } = useReadContract({
    address: tranches.AAA?.address as Address,
    abi: tranches.AAA?.abi,
    functionName: 'balanceOf',
    args: [address as Address],
  }) as { data: bigint; isLoading: boolean; refetch: () => void };

  const { data: trancheAABalance = 0n, isLoading: isLoadingBalanceAA, refetch: refetchBalanceAA } = useReadContract({
    address: tranches.AA?.address as Address,
    abi: tranches.AA?.abi,
    functionName: 'balanceOf',
    args: [address as Address],
  }) as { data: bigint; isLoading: boolean; refetch: () => void };

  const isLoadingBalances = isLoadingBalanceAAA || isLoadingBalanceAA;
  const totalBalance = trancheAAABalance + trancheAABalance;

  const {
    amount,
    error: amountError,
    handleAmountChange,
    validateAmount,
    reset: resetAmount,
    amountInWei
  } = useAmountForm(totalBalance, 2, 6);

  // Track when to update balances
  const [shouldUpdateBalances, setShouldUpdateBalances] = useState<boolean>(false);

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
        if (!Insurance?.address) throw new Error('Insurance contract not found');
        const individualAmount = amountInWei / 2n; // Split between AAA and AA
        const hash = await writeContractAsync({
          address: Insurance.address as Address,
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
    `Tranche AAA: $${isLoadingBalanceAAA ? 'Loading...' : formatUnits(trancheAAABalance, 6)}`,
    `Tranche AA: $${isLoadingBalanceAA ? 'Loading...' : formatUnits(trancheAABalance, 6)}`
  ];

  const infoItems = [
    'Equal amounts are withdrawn from both tranches (AAA and AA)',
    'Your tranche tokens are burned and you receive USDC in return',
    'USDC is withdrawn proportionally from Aave and Moonwell',
    'The amount must be divisible by 2 to ensure equal withdrawal from tranches',
    `Withdrawals will be enabled starting ${formattedWithdrawalDate}`
  ];

  return (
    <ContentCard title="Withdraw USDC" icon={<AccountBalance />}>
      <TransactionAlerts
        error={amountError || withdrawError}
        success={withdrawSuccess}
      />

      <Stack spacing={3}>
        <Box>
          <InfoBox title="Available in Tranches" items={balanceItems} />
          <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600, mt: 2, mb: 3 }}>
            Total Available to Withdraw: {isLoadingBalances ? 'Loading...' : formatUnits(totalBalance, 6)} USDC
          </Typography>

          <AmountInput
            amount={amount}
            setAmount={handleAmountChange}
            errorMessage={amountError}
            maxAmount={Number(formatUnits(totalBalance, 6))}
            decimals={6}
            symbol="USDC"
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
            amountInWei / 2n > trancheAAABalance ||
            amountInWei / 2n > trancheAABalance
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
