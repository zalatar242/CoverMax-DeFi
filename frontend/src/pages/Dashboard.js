import React from 'react';
import { Box, Typography, Button, Card, CardContent, Stack, Divider } from '@mui/material';
import { AccountBalance, SwapHoriz } from '@mui/icons-material';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { formatUSDC, calculatePercentage } from '../utils/analytics';
import { usePortfolioData, useProtocolStatus, useUSDCBalance } from '../utils/contracts';

// Custom theme colors
const colors = {
  primary: '#FF385C', // Airbnb red
  secondary: '#00A699', // Teal accent
  background: '#F7F7F7',
  text: '#484848',
  textLight: '#767676',
  card: '#FFFFFF',
  border: '#EBEBEB'
};

const Dashboard = () => {
  const { isConnected, address } = useWalletConnection();
  const { openConnectModal } = useWalletModal();
  const { balance: usdcBalance, isLoading: usdcLoading } = useUSDCBalance();
  const { trancheA, trancheB, trancheC, isLoading: portfolioLoading } = usePortfolioData();
  const { status, tvl, isLoading: protocolLoading } = useProtocolStatus();

  const loading = usdcLoading || portfolioLoading || protocolLoading;

  const ConnectWalletPrompt = () => (
    <Box
      sx={{
        p: 4,
        textAlign: 'center',
        background: colors.card,
        borderRadius: 3,
        boxShadow: '0 6px 12px rgba(0,0,0,0.05)',
        border: `1px solid ${colors.border}`,
        mb: 3
      }}
    >
      <Typography variant="h5" gutterBottom sx={{ color: colors.text, fontWeight: 600 }}>
        Welcome to CoverMax
      </Typography>
      <Typography variant="body1" sx={{ color: colors.textLight, mb: 3 }}>
        Connect your wallet to view your portfolio and start investing
      </Typography>
      <Button
        variant="contained"
        onClick={openConnectModal}
        size="large"
        sx={{
          bgcolor: colors.primary,
          '&:hover': {
            bgcolor: '#E6324F'
          },
          borderRadius: 2,
          px: 4,
          py: 1.5
        }}
      >
        Connect Wallet
      </Button>
    </Box>
  );

  const PortfolioOverview = () => (
    <Card
      elevation={0}
      sx={{
        background: colors.card,
        borderRadius: 3,
        boxShadow: '0 6px 12px rgba(0,0,0,0.05)',
        border: `1px solid ${colors.border}`,
        mb: 3
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4 }}>
          <Box>
            <Typography variant="h5" sx={{ color: colors.text, fontWeight: 600, mb: 0.5 }}>
              Portfolio Overview
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textLight }}>
              {status}
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<AccountBalance />}
              sx={{
                bgcolor: colors.primary,
                '&:hover': {
                  bgcolor: '#E6324F'
                },
                borderRadius: 2
              }}
            >
              Deposit USDC
            </Button>
            <Button
              variant="outlined"
              startIcon={<SwapHoriz />}
              sx={{
                color: colors.text,
                borderColor: colors.border,
                '&:hover': {
                  borderColor: colors.text
                },
                borderRadius: 2
              }}
            >
              Trade Tranches
            </Button>
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', gap: 4, mb: 4 }}>
          <Box>
            <Typography variant="body2" sx={{ color: colors.textLight, mb: 1 }}>
              Total Portfolio Value
            </Typography>
            <Typography variant="h4" sx={{ color: colors.text, fontWeight: 600 }}>
              {formatUSDC(parseFloat(trancheA) + parseFloat(trancheB) + parseFloat(trancheC))}
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ bgcolor: colors.border }} />
          <Box>
            <Typography variant="body2" sx={{ color: colors.textLight, mb: 1 }}>
              Available USDC
            </Typography>
            <Typography variant="h4" sx={{ color: colors.text, fontWeight: 600 }}>
              {formatUSDC(usdcBalance)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 3 }}>
          <TrancheSummary
            title="Senior"
            value={trancheA}
            total={parseFloat(trancheA) + parseFloat(trancheB) + parseFloat(trancheC)}
            color="#00A699"
          />
          <TrancheSummary
            title="Mezzanine"
            value={trancheB}
            total={parseFloat(trancheA) + parseFloat(trancheB) + parseFloat(trancheC)}
            color="#FF9F1C"
          />
          <TrancheSummary
            title="Junior"
            value={trancheC}
            total={parseFloat(trancheA) + parseFloat(trancheB) + parseFloat(trancheC)}
            color="#E01E5A"
          />
        </Box>
      </CardContent>
    </Card>
  );

  const TrancheSummary = ({ title, value, total, color }) => (
    <Box
      sx={{
        flex: 1,
        p: 3,
        borderRadius: 2,
        bgcolor: `${color}10`,
        border: '1px solid',
        borderColor: `${color}20`
      }}
    >
      <Typography variant="body1" sx={{ color: colors.text, fontWeight: 600, mb: 2 }}>
        {title} Tranche
      </Typography>
      <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600, mb: 1 }}>
        {formatUSDC(value)}
      </Typography>
      <Typography variant="body2" sx={{ color: colors.textLight }}>
        {calculatePercentage(value, total)} of portfolio
      </Typography>
    </Box>
  );

  const TVLSummary = ({ title, value, color }) => (
    <Box
      sx={{
        flex: 1,
        p: 3,
        borderRadius: 2,
        bgcolor: `${color}10`,
        border: '1px solid',
        borderColor: `${color}20`
      }}
    >
      <Typography variant="body1" sx={{ color: colors.text, fontWeight: 600, mb: 2 }}>
        {title} Tranche
      </Typography>
      <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600, mb: 1 }}>
        {formatUSDC(value)}
      </Typography>
      <Typography variant="body2" sx={{ color: colors.textLight }}>
        {calculatePercentage(value, tvl.total)} of TVL
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4 }}>
      {!isConnected ? (
        <ConnectWalletPrompt />
      ) : (
        <>
          <PortfolioOverview />
          <Card
            elevation={0}
            sx={{
              background: colors.card,
              borderRadius: 3,
              boxShadow: '0 6px 12px rgba(0,0,0,0.05)',
              border: `1px solid ${colors.border}`,
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ color: colors.text, fontWeight: 600, mb: 3 }}>
                Protocol Status
              </Typography>

              <Box sx={{ display: 'flex', gap: 4, mb: 4 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: colors.textLight, mb: 1 }}>
                    Total Value Locked
                  </Typography>
                  <Typography variant="h4" sx={{ color: colors.text, fontWeight: 600 }}>
                    {formatUSDC(tvl.total)}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ bgcolor: colors.border }} />
                <Box>
                  <Typography variant="body2" sx={{ color: colors.textLight, mb: 1 }}>
                    Current Phase
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.secondary, fontWeight: 600 }}>
                    {status}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 3 }}>
                <TVLSummary
                  title="Senior"
                  value={tvl.byTranche.A}
                  color="#00A699"
                />
                <TVLSummary
                  title="Mezzanine"
                  value={tvl.byTranche.B}
                  color="#FF9F1C"
                />
                <TVLSummary
                  title="Junior"
                  value={tvl.byTranche.C}
                  color="#E01E5A"
                />
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default Dashboard;
