import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import {
  Timeline,
  AccountBalance,
  Assessment
} from '@mui/icons-material';
import { getInsuranceContract, fetchPortfolioData, fetchProtocolStatus } from '../utils/contracts';
import { useAccount } from 'wagmi';
import { formatUSDC, calculatePercentage } from '../utils/analytics';

const Dashboard = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [portfolioData, setPortfolioData] = useState({
    trancheA: "0",
    trancheB: "0",
    trancheC: "0",
    depositedValue: "0"
  });
  const [protocolData, setProtocolData] = useState({
    status: "Deposit Period",
    nextPhase: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!isConnected || !address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const contract = await getInsuranceContract();

        const [portfolio, protocol] = await Promise.all([
          fetchPortfolioData(contract, address),
          fetchProtocolStatus(contract)
        ]);

        setPortfolioData(portfolio);
        setProtocolData(protocol);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [isConnected, address]);

  const PortfolioWidget = () => (
    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountBalance /> Portfolio Overview
      </Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : !isConnected ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Please connect your wallet to view your portfolio
        </Alert>
      ) : (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" color="textSecondary" gutterBottom>
              Total Portfolio Value
            </Typography>
            <Typography variant="h4" gutterBottom>
              {formatUSDC(portfolioData.depositedValue)}
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Senior Tranche (A)
                  </Typography>
                  <Typography variant="h6">{formatUSDC(portfolioData.trancheA)}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {calculatePercentage(portfolioData.trancheA, portfolioData.depositedValue)} of portfolio
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Mezzanine Tranche (B)
                  </Typography>
                  <Typography variant="h6">{formatUSDC(portfolioData.trancheB)}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {calculatePercentage(portfolioData.trancheB, portfolioData.depositedValue)} of portfolio
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Junior Tranche (C)
                  </Typography>
                  <Typography variant="h6">{formatUSDC(portfolioData.trancheC)}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {calculatePercentage(portfolioData.trancheC, portfolioData.depositedValue)} of portfolio
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to="/deposit"
            >
              Deposit USDC
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );

  const TimelineWidget = () => (
    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Timeline /> Protocol Status
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body1" gutterBottom>
          Current Period: {protocolData.status}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Next Phase: {protocolData.nextPhase}
        </Typography>
      </Box>
    </Paper>
  );

  const AnalyticsWidget = () => (
    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Assessment /> Quick Stats
      </Typography>
      {!isConnected ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Connect wallet to view analytics
        </Alert>
      ) : (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            Your Deposited Value: ${portfolioData.depositedValue} USDC
          </Typography>
          <Button
            variant="text"
            color="primary"
            component={Link}
            to="/analytics"
          >
            View Full Analytics
          </Button>
        </Box>
      )}
    </Paper>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <PortfolioWidget />
        </Grid>
        <Grid item xs={12} md={6}>
          <TimelineWidget />
        </Grid>
        <Grid item xs={12} md={6}>
          <AnalyticsWidget />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
