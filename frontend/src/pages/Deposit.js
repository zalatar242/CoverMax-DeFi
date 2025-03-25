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
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSimulateContract } from 'wagmi';
import { parseUnits } from 'viem';
import Insurance from '../contracts.json';

const Deposit = () => {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Reset form when wallet disconnects
    if (!isConnected) {
      setAmount('');
      setError(null);
      setSuccess(false);
    }
  }, [isConnected]);

  // Prepare USDC approval
  const { data: approveSimData, error: approveSimError } = useSimulateContract({
    address: Insurance.USDC_ADDRESS,
    abi: ['function approve(address spender, uint256 amount) returns (bool)'],
    functionName: 'approve',
    args: amount ? [Insurance.address, parseUnits(amount, 6)] : undefined,
    enabled: !!amount && validateAmount(amount)
  });

  const {
    writeContract: approve,
    data: approveData,
    error: approveError
  } = useWriteContract();

  const {
    isLoading: isApproving,
    isSuccess: isApproved
  } = useWaitForTransactionReceipt({
    hash: approveData
  });

  // Prepare deposit
  const { data: depositSimData, error: depositSimError } = useSimulateContract({
    address: Insurance.address,
    abi: Insurance.abi,
    functionName: 'deposit',
    args: amount ? [parseUnits(amount, 6), 33n, 33n, 33n] : undefined,
    enabled: !!amount && validateAmount(amount) && isApproved
  });

  const {
    writeContract: deposit,
    data: depositData,
    error: depositError
  } = useWriteContract();

  const {
    isLoading: isDepositing,
    isSuccess: isDeposited
  } = useWaitForTransactionReceipt({
    hash: depositData
  });

  useEffect(() => {
    if (isDeposited) {
      setSuccess(true);
    }
  }, [isDeposited]);

  const validateAmount = (value) => {
    if (!value || isNaN(value)) return false;
    const numValue = parseFloat(value);
    return numValue > 0 && numValue % 3 === 0;
  };

  const handleAmountChange = (event) => {
    const value = event.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      if (value && !validateAmount(value)) {
        setError("Amount must be divisible by 3 for equal tranche allocation");
      } else {
        setError(null);
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

      // First approve
      if (approveSimData) {
        await approve?.(approveSimData.request);
      }

      // Then deposit after approval
      if (isApproved && depositSimData) {
        await deposit?.(depositSimData.request);
      }
    } catch (err) {
      console.error("Error during deposit:", err);
      setError(err.message || "Error during deposit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          disabled={loading || isApproving || isDepositing}
        />

        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Your deposit will be equally split between all three tranches (33% each)
        </Typography>

        <RiskExplanation />

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleDeposit}
            disabled={!validateAmount(amount) || loading || isApproving || isDepositing}
          >
            {isApproving || isDepositing ? (
              <CircularProgress size={24} color="inherit" />
            ) : isApproved && !isDeposited ? (
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
