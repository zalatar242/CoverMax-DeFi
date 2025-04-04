import React from 'react';
import { Box, Typography, Button, Card, CardContent, Stack, Divider, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AccountBalance, SwapHoriz, ErrorOutline } from '@mui/icons-material';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { formatUSDC, calculatePercentage } from '../utils/analytics';
import { usePortfolioData, useProtocolStatus, useUSDCBalance } from '../utils/contracts';

// Custom theme colors - Stripe-inspired with purple accent
const colors = {
  primary: '#9097ff',
  primaryDark: '#7A82FF',
  secondary: '#6772E5',
  background: '#F6F9FC',
  text: '#3D4168',
  textLight: '#6B7C93',
  card: '#FFFFFF',
  border: '#E6E9F0'
};

const Dashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const { isConnected, address } = useWalletConnection();
  const { openConnectModal } = useWalletModal();
  const { balance: usdcBalance, isLoading: usdcLoading } = useUSDCBalance();
  const { trancheA, trancheB, trancheC, isLoading: portfolioLoading } = usePortfolioData();
  const { status, tvl, isLoading: protocolLoading } = useProtocolStatus();

  const loading = usdcLoading || portfolioLoading || protocolLoading;

  const WithdrawalInfoBox = () => (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        bgcolor: 'rgba(144, 151, 255, 0.05)',
        border: '1px dashed',
        borderColor: 'rgba(144, 151, 255, 0.2)',
        mb: 3,
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 2
      }}
    >
      <ErrorOutline sx={{ color: colors.primary, mt: { xs: 0.5, sm: 0 } }} />
      <Box>
        <Typography variant="body2" sx={{
          color: colors.text,
          fontWeight: 500,
          mb: 0.5
        }}>
          Emergency Withdrawal Priority
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: { xs: 1, sm: 2 },
            '& > div': {
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }
          }}
        >
          <Box>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'rgba(144, 151, 255, 0.1)',
                color: colors.primary,
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              Tranche A
            </Box>
            <Typography variant="caption" sx={{ color: colors.textLight }}>
              First
            </Typography>
          </Box>
          <Box>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'rgba(144, 151, 255, 0.1)',
                color: colors.primary,
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              Tranche B
            </Box>
            <Typography variant="caption" sx={{ color: colors.textLight }}>
              Second
            </Typography>
          </Box>
          <Box>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'rgba(144, 151, 255, 0.1)',
                color: colors.primary,
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              Tranche C
            </Box>
            <Typography variant="caption" sx={{ color: colors.textLight }}>
              Third
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const ConnectWalletPrompt = () => (
    <Box
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
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
        Connect your wallet to view your portfolio and start protecting your assets
      </Typography>
      <Button
        variant="contained"
        onClick={openConnectModal}
        size="large"
        sx={{
          bgcolor: colors.primary,
          '&:hover': {
            bgcolor: colors.primaryDark
          },
          borderRadius: 2,
          px: 4,
          py: 1.5,
          width: { xs: '100%', sm: 'auto' }
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
      <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          justifyContent: 'space-between',
          mb: 4,
          gap: 2
        }}>
          <Box>
            <Typography variant="h5" sx={{ color: colors.text, fontWeight: 600, mb: 0.5 }}>
              Portfolio Overview
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textLight }}>
              {status}
            </Typography>
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            width={{ xs: '100%', sm: 'auto' }}
          >
            <Button
              variant="contained"
              fullWidth={isMobile}
              startIcon={<AccountBalance />}
              onClick={() => navigate('/deposit')}
              sx={{
                bgcolor: colors.primary,
                '&:hover': {
                  bgcolor: colors.primaryDark
                },
                borderRadius: 2,
                minWidth: { sm: '140px' }
              }}
            >
              Deposit USDC
            </Button>
            <Button
              variant="outlined"
              fullWidth={isMobile}
              startIcon={<SwapHoriz />}
              sx={{
                color: colors.text,
                borderColor: colors.border,
                '&:hover': {
                  borderColor: colors.text
                },
                borderRadius: 2,
                minWidth: { sm: '140px' }
              }}
            >
              Trade Tranches
            </Button>
          </Stack>
        </Box>

        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          mb: 4
        }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ color: colors.textLight, mb: 1 }}>
              Total Portfolio Value
            </Typography>
            <Typography variant="h4" sx={{ color: colors.text, fontWeight: 600 }}>
              {formatUSDC(parseFloat(trancheA) + parseFloat(trancheB) + parseFloat(trancheC))}
            </Typography>
          </Box>
          <Divider orientation={isTablet ? 'horizontal' : 'vertical'} flexItem sx={{ bgcolor: colors.border }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ color: colors.textLight, mb: 1 }}>
              Available USDC
            </Typography>
            <Typography variant="h4" sx={{ color: colors.text, fontWeight: 600 }}>
              {formatUSDC(usdcBalance)}
            </Typography>
          </Box>
        </Box>

        <Box>
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 2, md: 3 },
            '& > *': {
              flex: { xs: '1 1 100%', sm: '1 1 0', md: '1 1 0' }
            },
            mb: 3
          }}>
            <TrancheSummary
              title="A"
              value={trancheA}
              total={parseFloat(trancheA) + parseFloat(trancheB) + parseFloat(trancheC)}
            />
            <TrancheSummary
              title="B"
              value={trancheB}
              total={parseFloat(trancheA) + parseFloat(trancheB) + parseFloat(trancheC)}
            />
            <TrancheSummary
              title="C"
              value={trancheC}
              total={parseFloat(trancheA) + parseFloat(trancheB) + parseFloat(trancheC)}
            />
          </Box>
          <WithdrawalInfoBox />
        </Box>
      </CardContent>
    </Card>
  );

  const TrancheSummary = ({ title, value, total }) => (
    <Box
      sx={{
        height: '100%',
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        bgcolor: `${colors.primary}08`,
        border: '1px solid',
        borderColor: `${colors.primary}20`
      }}
    >
      <Typography variant="body1" sx={{ color: colors.text, fontWeight: 600, mb: 2 }}>
        Tranche {title}
      </Typography>
      <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600, mb: 1 }}>
        {formatUSDC(value)}
      </Typography>
      <Typography variant="body2" sx={{ color: colors.textLight }}>
        {calculatePercentage(value, total)} of portfolio
      </Typography>
    </Box>
  );

  const TVLSummary = ({ title, value }) => (
    <Box
      sx={{
        height: '100%',
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        bgcolor: `${colors.primary}08`,
        border: '1px solid',
        borderColor: `${colors.primary}20`
      }}
    >
      <Typography variant="body1" sx={{ color: colors.text, fontWeight: 600, mb: 2 }}>
        Tranche {title}
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
    <Box sx={{
      maxWidth: 1200,
      mx: 'auto',
      p: { xs: 2, sm: 3, md: 4 }
    }}>
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
            <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="h5" sx={{ color: colors.text, fontWeight: 600, mb: 3 }}>
                Protocol Status
              </Typography>

              <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 3,
                mb: 4
              }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: colors.textLight, mb: 1 }}>
                    Total Value Locked
                  </Typography>
                  <Typography variant="h4" sx={{ color: colors.text, fontWeight: 600 }}>
                    {formatUSDC(tvl.total)}
                  </Typography>
                </Box>
                <Divider orientation={isTablet ? 'horizontal' : 'vertical'} flexItem sx={{ bgcolor: colors.border }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: colors.textLight, mb: 1 }}>
                    Current Phase
                  </Typography>
                  <Typography variant="h6" sx={{ color: colors.secondary, fontWeight: 600 }}>
                    {status}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 2, sm: 2, md: 3 },
                '& > *': {
                  flex: { xs: '1 1 100%', sm: '1 1 0', md: '1 1 0' }
                }
              }}>
                <TVLSummary
                  title="A"
                  value={tvl.byTranche.A}
                />
                <TVLSummary
                  title="B"
                  value={tvl.byTranche.B}
                />
                <TVLSummary
                  title="C"
                  value={tvl.byTranche.C}
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
