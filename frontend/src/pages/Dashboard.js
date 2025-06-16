import React from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import {
  Button,
  Stack,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import { AccountBalance, SwapHoriz } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { formatUSDC, formatCMX, calculatePercentage } from '../utils/analytics';
import {
  usePortfolioData,
  useProtocolStatus,
  useUSDCBalance,
  useProtocolAPY,
  useEarnedInterest
} from '../utils/contracts';
import { ContentCard } from '../components/ui';
import ProtocolTimeline from '../components/ProtocolTimeline';
import SummaryBox from '../components/SummaryBox';
import RiskChart from '../components/dashboard/RiskChart';
import WithdrawalInfoBox from '../components/dashboard/WithdrawalInfoBox';
import ConnectWalletPrompt from '../components/dashboard/ConnectWalletPrompt';

const Dashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const { isConnected } = useWalletConnection();
  const { openConnectModal } = useWalletModal();
  const { balance: usdcBalance } = useUSDCBalance();
  const { trancheAAA, trancheAA } = usePortfolioData();
  const { status, tvl, phases } = useProtocolStatus();
  const protocolAPY = useProtocolAPY();
  const totalValue = parseFloat(trancheAAA) + parseFloat(trancheAA);
  const { total: earnedInterest, ratePerSecond, isEarning } = useEarnedInterest(totalValue);
  const averageAPY = (protocolAPY.aave + protocolAPY.moonwell) / 2;

  // Constants for animation and sync intervals
  const EARNINGS_UPDATE_FREQUENCY = 100; // milliseconds
  const EARNINGS_SYNC_INTERVAL = 5000; // milliseconds
  const RATE_PER_SECOND_DIVISOR = 10;

  // State for animated earnings display
  const [displayedEarnings, setDisplayedEarnings] = React.useState(0);

  // Reset displayed earnings when actual earnings change
  React.useEffect(() => {
    setDisplayedEarnings(earnedInterest);
  }, [earnedInterest]);

  React.useEffect(() => {
    if (!isEarning) {
      setDisplayedEarnings(earnedInterest);
      return;
    }

    // Update displayed earnings more frequently for smooth animation
    const animate = () => {
      setDisplayedEarnings(prev => prev + (ratePerSecond / RATE_PER_SECOND_DIVISOR)); // Update every 100ms
    };

    const intervalId = setInterval(animate, EARNINGS_UPDATE_FREQUENCY);
    return () => clearInterval(intervalId);
  }, [isEarning, ratePerSecond]);

  // Sync displayed earnings with actual earnings periodically
  React.useEffect(() => {
    const syncInterval = setInterval(() => {
      setDisplayedEarnings(earnedInterest);
    }, EARNINGS_SYNC_INTERVAL); // Sync every 5 seconds
    return () => clearInterval(syncInterval);
  }, [earnedInterest]);


  if (!isConnected) {
    return <ConnectWalletPrompt openConnectModal={openConnectModal} />;
  }

  return (
    <Box sx={{
      maxWidth: 1200,
      mx: 'auto',
      p: { xs: 2, sm: 3, md: 4 }
    }}>
      <ContentCard>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          justifyContent: 'space-between',
          mb: 4,
          gap: 2
        }}>
          <Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 600, mb: 0.5 }}>
                Portfolio Overview
              </Typography>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                {status}
              </Typography>
            </Box>
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            width={{ xs: '100%', sm: 'auto' }}
          >
            <Button
              variant="contained"
              color="primary"
              fullWidth={isMobile}
              startIcon={<AccountBalance />}
              onClick={() => navigate('/deposit')}
              sx={{ minWidth: { sm: '140px' } }}
            >
              Deposit USDC
            </Button>
            <Button
              variant="outlined"
              fullWidth={isMobile}
              startIcon={<SwapHoriz />}
              onClick={() => navigate('/trade')}
              sx={{ minWidth: { sm: '140px' } }}
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
            <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 500, mb: 1 }}>
              Total Portfolio Value
              <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                • Available USDC: {formatUSDC(usdcBalance)}
              </Typography>
            </Typography>
            <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {formatUSDC(totalValue)}
            </Typography>
            {status === "Insurance Phase (5 days)" && (
              <Box sx={{ mt: 0.5 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  +{formatCMX(displayedEarnings)} earned
                  {isEarning && (
                    <Box
                      component="span"
                      sx={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'success.main',
                        animation: 'pulse 1.5s infinite',
                        '@keyframes pulse': {
                          '0%': {
                            opacity: 0.4,
                          },
                          '50%': {
                            opacity: 1,
                          },
                          '100%': {
                            opacity: 0.4,
                          },
                        },
                      }}
                    />
                  )}
                </Typography>
                {isEarning && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    +{formatCMX(ratePerSecond)} per second
                  </Typography>
                )}
              </Box>
            )}
          </Box>
          <Divider orientation={isTablet ? 'horizontal' : 'vertical'} flexItem />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 500, mb: 1 }}>
              Total Earnings
              <Typography component="span" variant="caption" sx={{ ml: 1, color: 'success.main' }}>
                • {(averageAPY * 100).toFixed(2)}% APY in CoverMax Tokens
              </Typography>
            </Typography>
            <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {formatCMX(displayedEarnings)}
            </Typography>
            {isEarning && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mt: 0.5
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'success.main',
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                      '0%': {
                        opacity: 0.4,
                      },
                      '50%': {
                        opacity: 1,
                      },
                      '100%': {
                        opacity: 0.4,
                      },
                    },
                  }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Earning {formatCMX(ratePerSecond)} per second
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 500, mb: 2 }}>
            Portfolio by Tranche
          </Typography>
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 2, md: 3 },
            '& > *': {
              flex: { xs: '1 1 100%', sm: '1 1 0', md: '1 1 0' }
            },
            mb: 3
          }}>
            <SummaryBox
              title="AAA"
              value={trancheAAA}
              valueFormatter={formatUSDC}
              description={`${calculatePercentage(trancheAAA, totalValue)} of portfolio`}
            />
            <SummaryBox
              title="AA"
              value={trancheAA}
              valueFormatter={formatUSDC}
              description={`${calculatePercentage(trancheAA, totalValue)} of portfolio`}
            />
          </Box>
          <WithdrawalInfoBox />

        </Box>
      </ContentCard>

      <ContentCard title="Risk Analysis">

          <RiskChart aaaTokens={parseFloat(trancheAAA)} aaTokens={parseFloat(trancheAA)} />
      </ContentCard>

      <ContentCard title="Protocol Status">
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          mb: 4
        }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 500, mb: 1 }}>
              Total Value Locked
            </Typography>
            <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {formatUSDC(tvl.total)}
            </Typography>
          </Box>
          <Divider orientation={isTablet ? 'horizontal' : 'vertical'} flexItem />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 500, mb: 2 }}>
              Protocol Timeline
            </Typography>
            <ProtocolTimeline status={status} phases={phases} />
          </Box>
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 500, mb: 2 }}>
            TVL by Yield Protocol
          </Typography>
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 2, md: 3 },
            '& > *': {
              flex: { xs: '1 1 100%', sm: '1 1 0', md: '1 1 0' }
            }
          }}>
            <SummaryBox
              title="Aave"
              value={tvl.total / 2}
              valueFormatter={formatUSDC}
              description="Industry-leading lending protocol with robust security"
            />
            <SummaryBox
              title="Moonwell"
              value={tvl.total / 2}
              valueFormatter={formatUSDC}
              description="Innovative Base protocol with competitive rates"
            />
          </Box>
        </Box>
      </ContentCard>

    </Box>
  );
};

export default Dashboard;
