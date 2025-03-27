import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Card, CardContent, Stack, Alert, CircularProgress } from '@mui/material';
import { ArrowBack, AccountBalance, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { useUSDCBalance } from '../utils/contracts';
import { useMainConfig } from '../utils/contractConfig';
import { parseUnits, formatUnits } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

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

const Deposit = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { isConnected, address } = useWalletConnection();
  const { openConnectModal } = useWalletModal();
  const { balance, isLoading: isLoadingBalance } = useUSDCBalance();
  const { USDC, Insurance } = useMainConfig();

  const { writeContract: approveUSDC, data: approveTxHash } = useWriteContract();
  const { writeContract: deposit, data: depositTxHash } = useWriteContract();

  const { isLoading: isWaitingApprove } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    onSuccess: () => {
      setIsApproving(false);
      setSuccess('USDC approval successful!');
    },
    onError: () => {
      setError('Failed to approve USDC');
      setIsApproving(false);
    }
  });

  const { isLoading: isWaitingDeposit } = useWaitForTransactionReceipt({
    hash: depositTxHash,
    onSuccess: () => {
      setIsDepositing(false);
      setAmount('');
      setSuccess('Deposit successful!');
    },
    onError: () => {
      setError('Failed to deposit');
      setIsDepositing(false);
    }
  });

  const validateAmount = (value) => {
    if (!value) return true; // Empty is valid (will be caught by disabled button)
    // Check if amount is divisible by 3
    const numValue = parseFloat(value);
    return Number.isInteger(numValue * 1000000 / 3); // Check divisibility accounting for 6 decimals
  };

  const handleApprove = async () => {
    try {
      setError('');
      setSuccess('');
      setIsApproving(true);

      const amountInWei = parseUnits(amount, 6); // USDC has 6 decimals
      approveUSDC({
        address: USDC.address,
        abi: USDC.abi,
        functionName: 'approve',
        args: [Insurance.address, amountInWei],
      });
    } catch (err) {
      setError('Failed to approve USDC: ' + err.message);
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
    try {
      if (!validateAmount(amount)) {
        setError('Amount must be divisible by 3');
        return;
      }
      setError('');
      setSuccess('');
      setIsDepositing(true);

      const amountInWei = parseUnits(amount, 6); // USDC has 6 decimals
      deposit({
        address: Insurance.address,
        abi: Insurance.abi,
        functionName: 'splitRisk',
        args: [amountInWei],
      });
    } catch (err) {
      setError('Failed to deposit: ' + err.message);
      setIsDepositing(false);
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
              Connect Wallet to Deposit
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
            Deposit USDC
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
            <Typography variant="body2" sx={{ color: colors.textLight, mb: 1 }}>
              Available Balance: {isLoadingBalance ? 'Loading...' : formatUnits(balance, 6)} USDC
            </Typography>
            <TextField
              fullWidth
              label="Amount to Deposit"
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
                      const maxAmount = Number(formatUnits(balance, 6));
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

            <Stack direction="row" spacing={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleApprove}
                disabled={!amount || isApproving || isWaitingApprove || !validateAmount(amount)}
                startIcon={<CheckCircle />}
                sx={{
                  color: colors.text,
                  borderColor: colors.border,
                  '&:hover': { borderColor: colors.text }
                }}
              >
                {(isApproving || isWaitingApprove) ? <CircularProgress size={24} /> : '1. Approve USDC'}
              </Button>
              <Button
                fullWidth
                variant="contained"
                onClick={handleDeposit}
                disabled={!amount || isDepositing || isWaitingDeposit}
                startIcon={<AccountBalance />}
                sx={{
                  bgcolor: colors.primary,
                  '&:hover': { bgcolor: colors.primaryDark }
                }}
              >
                {(isDepositing || isWaitingDeposit) ? <CircularProgress size={24} /> : '2. Deposit'}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ bgcolor: `${colors.primary}08`, p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600, mb: 2 }}>
              What happens when you deposit?
            </Typography>
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ color: colors.textLight }}>
                • Your USDC will be distributed across Aave, Compound, and Moonwell
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textLight }}>
                • You'll receive tranche tokens (A, B, C) representing your deposit
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textLight }}>
                • Each tranche has different risk/reward profiles and withdrawal priorities
              </Typography>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Deposit;
