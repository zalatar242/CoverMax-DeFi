import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { ethers } from 'ethers';
import contracts from '../contracts.json';

const Deposit = () => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

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
    if (!window.ethereum) {
      setError("Please install MetaMask to use this feature");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const usdc = new ethers.Contract(
        contracts.USDC.address,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        signer
      );

      const insurancePool = new ethers.Contract(
        contracts.InsurancePool.address,
        contracts.InsurancePool.abi,
        signer
      );

      // Convert amount to proper decimals
      const depositAmount = ethers.parseUnits(amount, 6); // USDC has 6 decimals

      // First approve USDC spending
      const approveTx = await usdc.approve(contracts.InsurancePool.address, depositAmount);
      await approveTx.wait();

      // Then deposit with equal allocation (33% each)
      const depositTx = await insurancePool.deposit(
        depositAmount,
        33,
        33,
        33
      );
      await depositTx.wait();

      setSuccess(true);
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
            <Typography variant="h6" gutterBottom>
              Tranche A (Senior)
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
            <Typography variant="h6" gutterBottom>
              Tranche B (Mezzanine)
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
            <Typography variant="h6" gutterBottom>
              Tranche C (Junior)
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

  if (success) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Deposit Successful!
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mb: 2 }}>
          Your deposit has been split equally between all three tranches.
          You can rebalance your risk allocation in the Portfolio page.
        </Typography>
        <Button variant="contained" href="/portfolio">
          Go to Portfolio
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
        />

        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Your deposit will be equally split between all three tranches (33% each)
        </Typography>

        <RiskExplanation />

        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleDeposit}
            disabled={!validateAmount(amount) || loading}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
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
