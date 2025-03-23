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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { ethers } from 'ethers';
import contracts from '../contracts.json';

const Analytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalValueLocked: "0",
    platformDistribution: {
      aave: "0",
      compound: "0",
      moonwell: "0"
    },
    trancheDistribution: {
      trancheA: "0",
      trancheB: "0",
      trancheC: "0"
    }
  });

  const loadAnalytics = async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask to use this feature");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      const insurancePool = new ethers.Contract(
        contracts.InsurancePool.address,
        contracts.InsurancePool.abi,
        provider
      );

      // Get total value locked
      const tvl = await insurancePool.getTotalValueLocked();

      // Get platform-specific TVL
      const aaveAdapter = new ethers.Contract(
        contracts.AaveLendingAdapter.address,
        contracts.AaveLendingAdapter.abi,
        provider
      );
      const compoundAdapter = new ethers.Contract(
        contracts.CompoundLendingAdapter.address,
        contracts.CompoundLendingAdapter.abi,
        provider
      );
      const moonwellAdapter = new ethers.Contract(
        contracts.MoonwellLendingAdapter.address,
        contracts.MoonwellLendingAdapter.abi,
        provider
      );

      const [aaveTVL, compoundTVL, moonwellTVL] = await Promise.all([
        aaveAdapter.getTotalValueLocked(),
        compoundAdapter.getTotalValueLocked(),
        moonwellAdapter.getTotalValueLocked()
      ]);

      // Get tranche-specific allocations
      const trancheATVL = await insurancePool.getTrancheValue(0);
      const trancheBTVL = await insurancePool.getTrancheValue(1);
      const trancheCTVL = await insurancePool.getTrancheValue(2);

      setAnalytics({
        totalValueLocked: ethers.formatUnits(tvl, 6),
        platformDistribution: {
          aave: ethers.formatUnits(aaveTVL, 6),
          compound: ethers.formatUnits(compoundTVL, 6),
          moonwell: ethers.formatUnits(moonwellTVL, 6)
        },
        trancheDistribution: {
          trancheA: ethers.formatUnits(trancheATVL, 6),
          trancheB: ethers.formatUnits(trancheBTVL, 6),
          trancheC: ethers.formatUnits(trancheCTVL, 6)
        }
      });

    } catch (err) {
      console.error("Error loading analytics:", err);
      setError("Error loading analytics data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const formatUSDC = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const calculatePercentage = (value, total) => {
    if (!total || parseFloat(total) === 0) return "0%";
    return ((parseFloat(value) / parseFloat(total)) * 100).toFixed(2) + "%";
  };

  const StatCard = ({ title, value, subValue }) => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4">
          {formatUSDC(value)}
        </Typography>
        {subValue && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {subValue}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Analytics
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
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <StatCard
                title="Total Value Locked"
                value={analytics.totalValueLocked}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Platform Distribution
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Platform</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="right">Percentage</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Aave</TableCell>
                        <TableCell align="right">
                          {formatUSDC(analytics.platformDistribution.aave)}
                        </TableCell>
                        <TableCell align="right">
                          {calculatePercentage(
                            analytics.platformDistribution.aave,
                            analytics.totalValueLocked
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Compound</TableCell>
                        <TableCell align="right">
                          {formatUSDC(analytics.platformDistribution.compound)}
                        </TableCell>
                        <TableCell align="right">
                          {calculatePercentage(
                            analytics.platformDistribution.compound,
                            analytics.totalValueLocked
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Moonwell</TableCell>
                        <TableCell align="right">
                          {formatUSDC(analytics.platformDistribution.moonwell)}
                        </TableCell>
                        <TableCell align="right">
                          {calculatePercentage(
                            analytics.platformDistribution.moonwell,
                            analytics.totalValueLocked
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Tranche Distribution
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tranche</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="right">Percentage</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Senior (A)</TableCell>
                        <TableCell align="right">
                          {formatUSDC(analytics.trancheDistribution.trancheA)}
                        </TableCell>
                        <TableCell align="right">
                          {calculatePercentage(
                            analytics.trancheDistribution.trancheA,
                            analytics.totalValueLocked
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Mezzanine (B)</TableCell>
                        <TableCell align="right">
                          {formatUSDC(analytics.trancheDistribution.trancheB)}
                        </TableCell>
                        <TableCell align="right">
                          {calculatePercentage(
                            analytics.trancheDistribution.trancheB,
                            analytics.totalValueLocked
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Junior (C)</TableCell>
                        <TableCell align="right">
                          {formatUSDC(analytics.trancheDistribution.trancheC)}
                        </TableCell>
                        <TableCell align="right">
                          {calculatePercentage(
                            analytics.trancheDistribution.trancheC,
                            analytics.totalValueLocked
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default Analytics;
