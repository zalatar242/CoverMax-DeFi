import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import {
  Timeline,
  AccountBalance,
  Assessment
} from '@mui/icons-material';

const Dashboard = () => {
  // Placeholder data - will be replaced with real data from smart contracts
  const portfolioData = {
    loading: false,
    trancheA: "0",
    trancheB: "0",
    trancheC: "0",
    protocolStatus: "Deposit Period",
    timelineDate: "2025-04-23",
    depositedValue: "0"
  };

  const PortfolioWidget = () => (
    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountBalance /> Portfolio Overview
      </Typography>
      {portfolioData.loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Tranche A Tokens
                  </Typography>
                  <Typography variant="h5">{portfolioData.trancheA}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Tranche B Tokens
                  </Typography>
                  <Typography variant="h5">{portfolioData.trancheB}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Tranche C Tokens
                  </Typography>
                  <Typography variant="h5">{portfolioData.trancheC}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" color="primary" href="/deposit">
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
          Current Period: {portfolioData.protocolStatus}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Next Phase: {portfolioData.timelineDate}
        </Typography>
      </Box>
    </Paper>
  );

  const AnalyticsWidget = () => (
    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Assessment /> Quick Stats
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body1" gutterBottom>
          Your Deposited Value: ${portfolioData.depositedValue} USDC
        </Typography>
        <Button variant="text" color="primary" href="/analytics">
          View Full Analytics
        </Button>
      </Box>
    </Paper>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
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
