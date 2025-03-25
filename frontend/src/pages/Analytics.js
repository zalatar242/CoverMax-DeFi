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
import { useReadContracts, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import Insurance from '../contracts.json';
import { formatUSDC, calculatePercentage, ADAPTER_ABI } from '../utils/analytics';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
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

  // Get TVL and adapter addresses
  const { data: mainData } = useReadContracts({
    contracts: [
      {
        address: Insurance.address,
        abi: Insurance.abi,
        functionName: 'getTotalValueLocked'
      },
      {
        address: Insurance.address,
        abi: Insurance.abi,
        functionName: 'AAVE_ADAPTER'
      },
      {
        address: Insurance.address,
        abi: Insurance.abi,
        functionName: 'COMPOUND_ADAPTER'
      },
      {
        address: Insurance.address,
        abi: Insurance.abi,
        functionName: 'MOONWELL_ADAPTER'
      }
    ]
  });

  // Get platform-specific TVL once we have adapter addresses
  const { data: platformData } = useReadContracts({
    contracts: mainData ? [
      {
        address: mainData[1],
        abi: ADAPTER_ABI,
        functionName: 'getTotalValueLocked'
      },
      {
        address: mainData[2],
        abi: ADAPTER_ABI,
        functionName: 'getTotalValueLocked'
      },
      {
        address: mainData[3],
        abi: ADAPTER_ABI,
        functionName: 'getTotalValueLocked'
      }
    ] : [],
    enabled: !!mainData
  });

  // Get tranche values
  const { data: trancheData } = useReadContracts({
    contracts: [
      {
        address: Insurance.address,
        abi: Insurance.abi,
        functionName: 'getTrancheValue',
        args: [0n]
      },
      {
        address: Insurance.address,
        abi: Insurance.abi,
        functionName: 'getTrancheValue',
        args: [1n]
      },
      {
        address: Insurance.address,
        abi: Insurance.abi,
        functionName: 'getTrancheValue',
        args: [2n]
      }
    ]
  });

  useEffect(() => {
    if (mainData && platformData && trancheData) {
      try {
        setError(null);
        const [tvl] = mainData;
        const [aaveTVL, compoundTVL, moonwellTVL] = platformData;
        const [trancheA, trancheB, trancheC] = trancheData;

        setAnalytics({
          totalValueLocked: formatUnits(tvl || 0n, 6),
          platformDistribution: {
            aave: formatUnits(aaveTVL || 0n, 6),
            compound: formatUnits(compoundTVL || 0n, 6),
            moonwell: formatUnits(moonwellTVL || 0n, 6)
          },
          trancheDistribution: {
            trancheA: formatUnits(trancheA || 0n, 6),
            trancheB: formatUnits(trancheB || 0n, 6),
            trancheC: formatUnits(trancheC || 0n, 6)
          }
        });
      } catch (err) {
        console.error("Error processing analytics data:", err);
        setError("Error processing analytics data. Please try again.");
      }
      setLoading(false);
    }
  }, [mainData, platformData, trancheData]);

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
