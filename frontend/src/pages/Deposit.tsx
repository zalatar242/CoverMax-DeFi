import React from 'react';
import { Button, Stack, CircularProgress, Typography, Box } from '@mui/material';
import { AccountBalance, CheckCircle } from '@mui/icons-material';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { useUSDCBalance, usePortfolioData } from '../utils/contracts';
import { useMainConfig } from '../utils/contractConfig';
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
  <ContentCard title="Connect Wallet to Deposit" icon={<AccountBalance />}>
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

const Deposit: React.FC = () => {
  const { isConnected, address } = useWalletConnection();
  const { openConnectModal } = useWalletModal();
  const { balance, isLoading: isLoadingBalance, refetch: refetchBalance } = useUSDCBalance();
  const { USDC, Insurance } = useMainConfig();
  const { refetch: refetchTrancheBalances } = usePortfolioData();

  const {
    amount,
    error: amountError,
    handleAmountChange,
    validateAmount,
    reset: resetAmount,
    amountInWei
  } = useAmountForm(typeof balance === 'bigint' ? balance : 0n, 2, 6);

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
    address: USDC?.address as Address,
    abi: USDC?.abi,
    functionName: 'allowance',
    args: [address as Address, Insurance?.address as Address],
  }) as { data: bigint; refetch: () => void };

  const { writeContractAsync } = useWriteContract();

  const handleApproveClick = () => {
    handleApprove(async () => {
      try {
        if (!USDC?.address || !Insurance?.address) throw new Error('Contract addresses not found');
        const hash = await writeContractAsync({
          address: USDC.address as Address,
          abi: USDC.abi,
          functionName: 'approve',
          args: [Insurance.address as Address, amountInWei]
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
        if (!Insurance?.address) throw new Error('Insurance contract address not found');
        const hash = await writeContractAsync({
          address: Insurance.address as Address,
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
    <ContentCard title="Deposit USDC" icon={<AccountBalance />}>
      <TransactionAlerts
        error={amountError || approveError || depositError}
        success={approveSuccess || depositSuccess}
      />

      <Stack spacing={3}>
        <div>
          <AmountInput
            amount={amount}
            setAmount={handleAmountChange}
            errorMessage={amountError}
            maxAmount={Number(formatUnits(typeof balance === 'bigint' ? balance : 0n, 6))}
            decimals={6}
            symbol="USDC"
          />
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Current Allowance: {formatUnits(allowance, 6)} USDC
          </Typography>
        </div>

        <Stack direction="row" spacing={2}>
          <Button
            fullWidth
            variant={amountInWei > allowance ? "contained" : "outlined"}
            onClick={handleApproveClick}
            disabled={!amount || isApproving || !validateAmount(amount) || amountInWei <= allowance}
            startIcon={isApproving ? <CircularProgress size={24} /> : <CheckCircle />}
            color="primary"
          >
            1. Approve USDC
          </Button>
          <Button
            fullWidth
            variant={amountInWei <= allowance ? "contained" : "outlined"}
            onClick={handleDepositClick}
            disabled={!amount || isDepositing || amountInWei > allowance}
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
