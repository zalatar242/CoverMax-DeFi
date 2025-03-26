import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useWalletConnection } from '../utils/walletConnector';
import { useMainConfig } from '../utils/contractConfig';
import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';

const Deposit = () => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const { isConnected, address } = useWalletConnection();
  const { Insurance, USDC } = useMainConfig();
  const navigate = useNavigate();

  // Check allowance
  const { data: allowance } = useReadContract({
    address: USDC?.address,
    abi: USDC?.abi,
    functionName: 'allowance',
    args: [address, Insurance?.address],
    enabled: Boolean(address && USDC && Insurance),
    watch: true,
  });

  // Write contract hooks
  const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  const { writeContract: writeDeposit, data: depositHash } = useWriteContract();

  // Transaction receipt hooks
  const { isLoading: isApproveLoading, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isDepositLoading, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  useEffect(() => {
    // Reset form when wallet disconnects
    if (!isConnected) {
      setAmount('');
      setError(null);
      setSuccess(false);
      setIsApproved(false);
    }
  }, [isConnected]);

  // Check if amount is approved
  useEffect(() => {
    if (amount && allowance) {
      const parsedAmount = parseUnits(amount, 6);
      setIsApproved(allowance >= parsedAmount);
    }
  }, [amount, allowance]);

  const validateAmount = (value) => {
    if (!value || isNaN(value)) return false;
    const numValue = parseFloat(value);
    return numValue > 0 && numValue % 3 === 0;
  };

  const handleAmountChange = (event) => {
    const value = event.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
      if (value && !validateAmount(value)) {
        setError("Amount must be divisible by 3 for equal tranche allocation");
      }
    }
  };

  const handleDeposit = async () => {
    if (!isConnected) {
      setError("Please connect your wallet to deposit");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!isApproved) {
        // Approve USDC
        writeApprove({
          address: USDC.address,
          abi: USDC.abi,
          functionName: 'approve',
          args: [Insurance.address, parseUnits(amount, 6)],
        });
      } else {
        // Deposit
        writeDeposit({
          address: Insurance.address,
          abi: Insurance.abi,
          functionName: 'deposit',
          args: [parseUnits(amount, 6), 33, 33, 33],
        });
      }
    } catch (err) {
      console.error("Error during deposit:", err);
      setError(err.message || "Error during deposit. Please try again.");
    }
  };

  // Handle transaction success
  useEffect(() => {
    if (isApproveSuccess) {
      setIsApproved(true);
      setLoading(false);
    }
    if (isDepositSuccess) {
      setSuccess(true);
      setLoading(false);
    }
  }, [isApproveSuccess, isDepositSuccess]);

  const RiskExplanation = () => (
    <Grid container spacing={2} sx={{ mt: 2 }}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Senior Tranche (A)
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Lowest risk, lowest potential returns. First to be paid out, last to take losses.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Allocation: 33%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Mezzanine Tranche (B)
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Medium risk, medium potential returns. Second to be paid out and take losses.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Allocation: 33%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Junior Tranche (C)
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Highest risk, highest potential returns. Last to be paid out, first to take losses.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Allocation: 33%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  if (!isConnected) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Deposit USDC
        </Typography>
        <Alert severity="info">
          Please connect your wallet to make a deposit
        </Alert>
      </Box>
    );
  }

  if (success) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Deposit Successful!
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mb: 2 }}>
          Your deposit has been split equally between all three tranches.
          You can view your portfolio for details.
        </Typography>
        <Button
          variant="contained"
          component={Link}
          to="/"
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Deposit USDC
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="USDC Amount (must be divisible by 3)"
          value={amount}
          onChange={handleAmountChange}
          type="text"
          placeholder="Enter amount"
          variant="outlined"
          sx={{ mb: 2 }}
          error={!!amount && !validateAmount(amount)}
          helperText={amount && !validateAmount(amount) ? "Amount must be divisible by 3" : ""}
          disabled={loading || isApproveLoading || isDepositLoading}
        />

        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Your deposit will be equally split between all three tranches (33% each)
        </Typography>

        <RiskExplanation />

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleDeposit}
            disabled={!validateAmount(amount) || loading || isApproveLoading || isDepositLoading}
          >
            {loading || isApproveLoading || isDepositLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : isApproved ? (
              'Deposit'
            ) : (
              'Approve & Deposit'
            )}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Deposit;
