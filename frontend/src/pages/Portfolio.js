import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  Slider,
  TextField,
} from '@mui/material';
import Insurance from '../contracts.json';
import { formatUSDC, calculatePercentage } from '../utils/analytics';
import { appKit } from '../utils/walletConnector';

const Portfolio = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState(null);
  const [portfolio, setPortfolio] = useState({
    totalValue: "0",
    trancheA: "0",
    trancheB: "0",
    trancheC: "0",
    allocations: {
      trancheA: 33,
      trancheB: 33,
      trancheC: 33
    }
  });

  useEffect(() => {
    const checkConnection = () => {
      const button = document.querySelector('appkit-button');
      if (button) {
        setIsConnected(!!button.address);
        setAddress(button.address || null);
      }
    };

    // Initial check
    checkConnection();

    // Listen for connection changes
    document.addEventListener('appkitAccountsChanged', (e) => {
      setIsConnected(!!e.detail.address);
      setAddress(e.detail.address || null);
    });

    return () => {
      document.removeEventListener('appkitAccountsChanged', checkConnection);
    };
  }, []);

  useEffect(() => {
    const fetchPortfolioData = async () => {
      if (!isConnected || !address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const provider = await appKit.getProvider();
        const insuranceContract = new provider.eth.Contract(Insurance.abi, Insurance.address);

        // Get balances for all tranches and total value
        const [trancheA, trancheB, trancheC, totalValue] = await Promise.all([
          insuranceContract.methods.balanceOf(address, 0).call(),
          insuranceContract.methods.balanceOf(address, 1).call(),
          insuranceContract.methods.balanceOf(address, 2).call(),
          insuranceContract.methods.getUserDepositedValue(address).call()
        ]);

        setPortfolio({
          totalValue: (totalValue / 1e6).toString(),
          trancheA: (trancheA / 1e6).toString(),
          trancheB: (trancheB / 1e6).toString(),
          trancheC: (trancheC / 1e6).toString(),
          allocations: {
            trancheA: Number(trancheA) > 0 ? 33 : 0,
            trancheB: Number(trancheB) > 0 ? 33 : 0,
            trancheC: Number(trancheC) > 0 ? 33 : 0
          }
        });

        setError(null);
      } catch (err) {
        console.error("Error processing portfolio data:", err);
        setError("Error processing portfolio data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, [isConnected, address]);

  const PortfolioSummary = () => (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Your Portfolio Summary
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Value
              </Typography>
              <Typography variant="h4">
                {formatUSDC(portfolio.totalValue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );

  const TrancheDetails = () => (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Tranche Allocations
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Senior Tranche (A)
              </Typography>
              <Typography variant="h6">
                {formatUSDC(portfolio.trancheA)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {calculatePercentage(portfolio.trancheA, portfolio.totalValue)} of portfolio
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
              <Typography variant="h6">
                {formatUSDC(portfolio.trancheB)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {calculatePercentage(portfolio.trancheB, portfolio.totalValue)} of portfolio
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
              <Typography variant="h6">
                {formatUSDC(portfolio.trancheC)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {calculatePercentage(portfolio.trancheC, portfolio.totalValue)} of portfolio
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );

  if (!isConnected) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Portfolio
        </Typography>
        <Alert severity="info">
          Please connect your wallet to view your portfolio
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Portfolio
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <PortfolioSummary />
          <TrancheDetails />
        </>
      )}
    </Box>
  );
};

export default Portfolio;
