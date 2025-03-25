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
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import Insurance from '../contracts.json';
import { formatUSDC, calculatePercentage } from '../utils/analytics';

const Portfolio = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // Get balances
  const { data: balances, isError: balancesError } = useReadContracts({
    contracts: [
      {
        address: Insurance.address,
        abi: Insurance.abi,
        functionName: 'balanceOf',
        args: address ? [address, 0n] : undefined,
      },
      {
        address: Insurance.address,
        abi: Insurance.abi,
        functionName: 'balanceOf',
        args: address ? [address, 1n] : undefined,
      },
      {
        address: Insurance.address,
        abi: Insurance.abi,
        functionName: 'balanceOf',
        args: address ? [address, 2n] : undefined,
      }
    ],
    enabled: isConnected && !!address,
  });

  // Get total value
  const { data: totalValue, isError: totalValueError } = useReadContract({
    address: Insurance.address,
    abi: Insurance.abi,
    functionName: 'getUserDepositedValue',
    args: address ? [address] : undefined,
    enabled: isConnected && !!address,
  });

  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    if (balances && totalValue) {
      try {
        setError(null);
        const [trancheA, trancheB, trancheC] = balances;

        setPortfolio({
          totalValue: formatUnits(totalValue, 6),
          trancheA: formatUnits(trancheA || 0n, 6),
          trancheB: formatUnits(trancheB || 0n, 6),
          trancheC: formatUnits(trancheC || 0n, 6),
          allocations: {
            trancheA: Number(formatUnits(trancheA || 0n, 6)) > 0 ? 33 : 0,
            trancheB: Number(formatUnits(trancheB || 0n, 6)) > 0 ? 33 : 0,
            trancheC: Number(formatUnits(trancheC || 0n, 6)) > 0 ? 33 : 0
          }
        });
      } catch (err) {
        console.error("Error processing portfolio data:", err);
        setError("Error processing portfolio data. Please try again.");
      }
    }

    if (balancesError || totalValueError) {
      setError("Error loading portfolio data. Please try again.");
    }

    setLoading(false);
  }, [isConnected, address, balances, totalValue, balancesError, totalValueError]);

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
