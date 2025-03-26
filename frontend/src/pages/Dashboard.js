import React from 'react';
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
  Assessment,
  AccountBalanceWallet
} from '@mui/icons-material';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { formatUSDC, calculatePercentage } from '../utils/analytics';
import { usePortfolioData, useProtocolStatus, useUSDCBalance } from '../utils/contracts';

const Dashboard = () => {
  const { isConnected, address } = useWalletConnection();
  const { openConnectModal } = useWalletModal();

  const {
    balance: usdcBalance,
    isError: usdcError,
    isLoading: usdcLoading
  } = useUSDCBalance();

  const {
    trancheA,
    trancheB,
    trancheC,
    depositedValue,
    isError: portfolioError,
    isLoading: portfolioLoading
  } = usePortfolioData();

  const {
    status,
    tvl,
    apy,
    isError: protocolError,
    isLoading: protocolLoading
  } = useProtocolStatus();

  const loading = usdcLoading || portfolioLoading || protocolLoading;
  const error = usdcError || portfolioError || protocolError;

  const ConnectWalletPrompt = () => (
    <Paper elevation={2} sx={{ p: 4, textAlign: 'center', mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Connect Your Wallet
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        Connect your wallet to view your portfolio and protocol statistics
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={openConnectModal}
        size="large"
      >
        Connect Wallet
      </Button>
    </Paper>
  );

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
              {formatUSDC(depositedValue)}
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Senior Tranche (A)
                  </Typography>
                  <Typography variant="h6">{formatUSDC(trancheA)}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {calculatePercentage(trancheA, depositedValue)} of portfolio
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
                  <Typography variant="h6">{formatUSDC(trancheB)}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {calculatePercentage(trancheB, depositedValue)} of portfolio
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
                  <Typography variant="h6">{formatUSDC(trancheC)}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {calculatePercentage(trancheC, depositedValue)} of portfolio
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
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            Current Period: {status}
          </Typography>
          <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
            TVL: ${tvl.total}
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={4}>
              <Typography variant="body2" color="textSecondary">
                Tranche A: ${tvl.byTranche.A}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="textSecondary">
                Tranche B: ${tvl.byTranche.B}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="textSecondary">
                Tranche C: ${tvl.byTranche.C}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}
    </Paper>
  );

  const APYWidget = () => (
    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Assessment /> Expected Returns
      </Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Senior (A)
                </Typography>
                <Typography variant="h6">
                  {apy.A}% APY
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Mezzanine (B)
                </Typography>
                <Typography variant="h6">
                  {apy.B}% APY
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Junior (C)
                </Typography>
                <Typography variant="h6">
                  {apy.C}% APY
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Paper>
  );

  const USDCBalanceWidget = () => (
    <Paper elevation={2} sx={{ p: 2, height: '100%', mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountBalanceWallet /> USDC Balance
      </Typography>
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : !isConnected ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {address === null ?
            "Checking wallet connection..." :
            "Please connect your wallet to view your USDC balance"
          }
        </Alert>
      ) : (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h4" gutterBottom>
            {formatUSDC(usdcBalance)}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Available USDC in Wallet
          </Typography>
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
          Failed to load dashboard data. Please try again later.
        </Alert>
      )}
      {!isConnected && <ConnectWalletPrompt />}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <USDCBalanceWidget />
        </Grid>
        <Grid item xs={12}>
          <PortfolioWidget />
        </Grid>
        <Grid item xs={12} md={6}>
          <TimelineWidget />
        </Grid>
        <Grid item xs={12} md={6}>
          <APYWidget />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
