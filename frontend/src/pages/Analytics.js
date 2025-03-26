import React from 'react';
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
import { useWalletConnection } from '../utils/walletConnector';
import { useMainConfig } from '../utils/contractConfig';
import { formatUSDC, calculatePercentage } from '../utils/analytics';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import contracts from '../contracts.json';

// Get the ABI from any of the lending adapters as they share the same interface
const ADAPTER_ABI = contracts.networks.mainnet.AaveLendingAdapter.abi;

const Analytics = () => {
  const { isConnected } = useWalletConnection();
  const { Insurance } = useMainConfig();

  // Get TVL and adapter addresses
  const { data: tvlData, isLoading: tvlLoading, isError: tvlError } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'getTotalValueLocked',
    enabled: Boolean(Insurance),
  });

  const { data: aaveAdapterData } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'AAVE_ADAPTER',
    enabled: Boolean(Insurance),
  });

  const { data: compoundAdapterData } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'COMPOUND_ADAPTER',
    enabled: Boolean(Insurance),
  });

  const { data: moonwellAdapterData } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'MOONWELL_ADAPTER',
    enabled: Boolean(Insurance),
  });

  // Get platform-specific TVL
  const { data: aaveTVLData, isLoading: aaveLoading } = useReadContract({
    address: aaveAdapterData,
    abi: ADAPTER_ABI,
    functionName: 'getTotalValueLocked',
    enabled: Boolean(aaveAdapterData),
  });

  const { data: compoundTVLData, isLoading: compoundLoading } = useReadContract({
    address: compoundAdapterData,
    abi: ADAPTER_ABI,
    functionName: 'getTotalValueLocked',
    enabled: Boolean(compoundAdapterData),
  });

  const { data: moonwellTVLData, isLoading: moonwellLoading } = useReadContract({
    address: moonwellAdapterData,
    abi: ADAPTER_ABI,
    functionName: 'getTotalValueLocked',
    enabled: Boolean(moonwellAdapterData),
  });

  // Get tranche values
  const { data: trancheAData, isLoading: trancheALoading } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'getTrancheValue',
    args: [0],
    enabled: Boolean(Insurance),
  });

  const { data: trancheBData, isLoading: trancheBLoading } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'getTrancheValue',
    args: [1],
    enabled: Boolean(Insurance),
  });

  const { data: trancheCData, isLoading: trancheCLoading } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'getTrancheValue',
    args: [2],
    enabled: Boolean(Insurance),
  });

  const loading = tvlLoading || aaveLoading || compoundLoading || moonwellLoading ||
                 trancheALoading || trancheBLoading || trancheCLoading;

  const analytics = {
    totalValueLocked: tvlData ? formatUnits(tvlData, 6) : "0",
    platformDistribution: {
      aave: aaveTVLData ? formatUnits(aaveTVLData, 6) : "0",
      compound: compoundTVLData ? formatUnits(compoundTVLData, 6) : "0",
      moonwell: moonwellTVLData ? formatUnits(moonwellTVLData, 6) : "0"
    },
    trancheDistribution: {
      trancheA: trancheAData ? formatUnits(trancheAData, 6) : "0",
      trancheB: trancheBData ? formatUnits(trancheBData, 6) : "0",
      trancheC: trancheCData ? formatUnits(trancheCData, 6) : "0"
    }
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

  if (!isConnected) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Analytics
        </Typography>
        <Alert severity="info">
          Please connect your wallet to view analytics
        </Alert>
      </Box>
    );
  }

  if (tvlError) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Analytics
        </Typography>
        <Alert severity="error">
          Error loading analytics data. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Analytics
      </Typography>

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
