import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Card, CardContent, Stack, Alert, CircularProgress } from '@mui/material';
import { ArrowBack, AccountBalance, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { useMainConfig, useTranchesConfig } from '../utils/contractConfig';
import { parseUnits, formatUnits } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';

const colors = {
  primary: '#9097ff',
  primaryDark: '#7A82FF',
  secondary: '#6772E5',
  background: '#F6F9FC',
  text: '#3D4168',
  textLight: '#6B7C93',
  card: '#FFFFFF',
  border: '#E6E9F0'
};

const Withdraw = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { isConnected, address } = useWalletConnection();
  const { openConnectModal } = useWalletModal();
  const { Insurance } = useMainConfig();
  const tranches = useTranchesConfig();

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

  const { writeContract: claim, data: withdrawTxHash } = useWriteContract();

  const { isLoading: isWaitingWithdraw } = useWaitForTransactionReceipt({
    hash: withdrawTxHash,
    enabled: Boolean(withdrawTxHash),
    onSuccess: () => {
      setAmount('');
      setSuccess('Withdrawal successful!');
    },
    onError: () => {
      setError('Failed to withdraw');
    },
    onSettled: () => {
      setIsWithdrawing(false);
    }
  });

  // Reset loading states when no transaction hash
  React.useEffect(() => {
    if (!withdrawTxHash) {
      setIsWithdrawing(false);
    }
  }, [withdrawTxHash]);

  const validateAmount = (value) => {
    if (!value) return true;
    const numValue = parseFloat(value);
    return Number.isInteger(numValue * 1000000 / 3); // Check divisibility accounting for 6 decimals
  };

  const handleWithdraw = async () => {
    try {
      if (!validateAmount(amount)) {
        setError('Amount must be divisible by 3');
        return;
      }
      setError('');
      setSuccess('');
      setIsWithdrawing(true);

      const amountInWei = parseUnits(amount, 6); // USDC has 6 decimals
      const individualAmount = amountInWei / 3n; // Split amount equally between tranches

      claim({
        address: Insurance.address,
        abi: Insurance.abi,
        functionName: 'claim',
        args: [individualAmount, individualAmount, individualAmount],
      });
    } catch (err) {
      setError('Failed to withdraw: ' + err.message);
      setIsWithdrawing(false);
    }
  };

  if (!isConnected) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, sm: 3, md: 4 } }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mb: 3, color: colors.text }}
        >
          Back to Dashboard
        </Button>

        <Card
          elevation={0}
          sx={{
            background: colors.card,
            borderRadius: 3,
            boxShadow: '0 6px 12px rgba(0,0,0,0.05)',
            border: `1px solid ${colors.border}`
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 }, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ color: colors.text, fontWeight: 600, mb: 3 }}>
              Connect Wallet to Withdraw
            </Typography>
            <Button
              variant="contained"
              onClick={openConnectModal}
              sx={{
                bgcolor: colors.primary,
                '&:hover': { bgcolor: colors.primaryDark }
              }}
            >
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, sm: 3, md: 4 } }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3, color: colors.text }}
      >
        Back to Dashboard
      </Button>

      <Card
        elevation={0}
        sx={{
          background: colors.card,
          borderRadius: 3,
          boxShadow: '0 6px 12px rgba(0,0,0,0.05)',
          border: `1px solid ${colors.border}`
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Typography variant="h5" sx={{ color: colors.text, fontWeight: 600, mb: 3 }}>
            Withdraw USDC
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          <Box sx={{ mb: 4 }}>
            <Stack spacing={1} sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: colors.textLight }}>
                Available in Tranches:
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textLight, pl: 2 }}>
                • Tranche A: {isLoadingBalanceA ? 'Loading...' : formatUnits(trancheABalance, 6)} USDC
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textLight, pl: 2 }}>
                • Tranche B: {isLoadingBalanceB ? 'Loading...' : formatUnits(trancheBBalance, 6)} USDC
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textLight, pl: 2 }}>
                • Tranche C: {isLoadingBalanceC ? 'Loading...' : formatUnits(trancheCBalance, 6)} USDC
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text, fontWeight: 600 }}>
                Total Available: {isLoadingBalances ? 'Loading...' : formatUnits(totalBalance, 6)} USDC
              </Typography>
            </Stack>

            <TextField
              fullWidth
              label="Amount to Withdraw"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                setAmount(value);
                if (value && !validateAmount(value)) {
                  setError('Amount must be divisible by 3');
                } else {
                  setError('');
                }
              }}
              type="number"
              InputProps={{
                endAdornment: (
                  <Button
                    size="small"
                    onClick={() => {
                      const maxAmount = Number(formatUnits(totalBalance, 6));
                      const roundedAmount = Math.floor(maxAmount / 3) * 3;
                      setAmount(roundedAmount.toString());
                    }}
                    sx={{ color: colors.primary }}
                  >
                    MAX
                  </Button>
                )
              }}
              sx={{ mb: 2 }}
            />

            <Button
              fullWidth
              variant="contained"
              onClick={handleWithdraw}
              disabled={
                !amount ||
                isWithdrawing ||
                isWaitingWithdraw ||
                !validateAmount(amount) ||
                parseUnits(amount, 6) > totalBalance ||
                parseUnits(amount, 6) / 3n > trancheABalance ||
                parseUnits(amount, 6) / 3n > trancheBBalance ||
                parseUnits(amount, 6) / 3n > trancheCBalance
              }
              startIcon={<AccountBalance />}
              sx={{
                bgcolor: colors.primary,
                '&:hover': { bgcolor: colors.primaryDark }
              }}
            >
              {(isWithdrawing || isWaitingWithdraw) ? <CircularProgress size={24} /> : 'Withdraw'}
            </Button>
          </Box>

          <Box sx={{ bgcolor: `${colors.primary}08`, p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600, mb: 2 }}>
              What happens when you withdraw?
            </Typography>
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ color: colors.textLight }}>
                • Equal amounts are withdrawn from each tranche (A, B, C)
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textLight }}>
                • Your tranche tokens are burned and you receive USDC in return
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textLight }}>
                • USDC is withdrawn proportionally from Aave, Compound, and Moonwell
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textLight }}>
                • The amount must be divisible by 3 to ensure equal withdrawal from tranches
              </Typography>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Withdraw;
