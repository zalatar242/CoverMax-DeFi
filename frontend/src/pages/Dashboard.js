import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, ReferenceLine } from 'recharts';
import { useTheme, useMediaQuery } from '@mui/material';
import { generateChartData, generateXAxisTicks } from '../utils/riskCalculations';
import React from 'react';
import {
  Button,
  Stack,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import { AccountBalance, SwapHoriz, ErrorOutline, } from '@mui/icons-material';
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const totalRecovery = payload[0]?.value || 0;
  const aaaRecovery = payload[1]?.value || 0;
  const aaRecovery = payload[2]?.value || 0;

  return (
    <Box
      sx={{
        p: 1.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        maxWidth: '200px',
        boxShadow: 1
      }}
    >
      <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
        Exploit Severity: {(label * 100).toFixed(0)}%
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: 'primary.main',
          fontSize: { xs: '0.75rem', sm: '0.875rem' },
          mb: 0.5
        }}
      >
        Total Recovery: {formatUSDC(totalRecovery)}
      </Typography>
      {payload[1] && (
        <Typography
          variant="body2"
          sx={{
            color: 'success.main',
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            mb: 0.5
          }}
        >
          AAA Recovery: {formatUSDC(aaaRecovery)}
        </Typography>
      )}
      {payload[2] && (
        <Typography
          variant="body2"
          sx={{
            color: 'info.main',
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }}
        >
          AA Recovery: {formatUSDC(aaRecovery)}
        </Typography>
      )}
    </Box>
  );
};

const RiskChart = ({ aaaTokens, aaTokens }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const data = generateChartData(aaaTokens, aaTokens);
  const xAxisTicks = generateXAxisTicks();

  return (
    <Box>
      <Typography
        variant="subtitle1"
        sx={{
          mb: { xs: 2, sm: 3 },
          fontWeight: 600,
          color: 'text.primary'
        }}
      >
        Recovery Amount vs Exploit Severity
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 4 },
          mt: { xs: 1, sm: 2 }
        }}
      >
        <Box
          sx={{
            flex: { md: '1 1 70%' },
            height: { xs: 300, sm: 400 }
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 20,
                right: isMobile ? 10 : 30,
                left: isMobile ? 40 : 60,
                bottom: isMobile ? 20 : 30
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis
                dataKey="x"
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                ticks={xAxisTicks}
                domain={[0, 1]}
                label={{
                  value: 'Exploit Severity',
                  position: 'insideBottom',
                  offset: -10,
                  style: {
                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                  }
                }}
                tick={{
                  fontSize: isMobile ? 10 : 12,
                  fill: theme.palette.text.secondary
                }}
                minTickGap={20}
              />
              <YAxis
                tickFormatter={formatUSDC}
                label={{
                  value: 'Recovery Amount (USDC)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: isMobile ? -10 : -20,
                  dy: isMobile ? 50 : 70,
                  style: {
                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                  }
                }}
                tick={{
                  fontSize: isMobile ? 10 : 12,
                  fill: theme.palette.text.secondary
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={isMobile ? 48 : 36}
                wrapperStyle={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem'
                }}
              />
              {/* Reference lines */}
              <ReferenceLine
                x={0.5}
                stroke={theme.palette.warning.main}
                strokeDasharray="3 3"
                label={{
                  value: '1 Protocol Exploited',
                  position: 'top',
                  fill: theme.palette.warning.main,
                  fontSize: isMobile ? '0.65rem' : '0.75rem'
                }}
              />
              <ReferenceLine
                x={1}
                stroke={theme.palette.error.main}
                strokeDasharray="3 3"
                label={{
                  value: '2 Protocols Exploited',
                  position: 'top',
                  fill: theme.palette.error.main,
                  fontSize: isMobile ? '0.65rem' : '0.75rem'
                }}
              />
              {/* Lines for each token type */}
              <Line
                type="monotone"
                dataKey="recovery"
                name="Total Recovery"
                stroke={theme.palette.primary.main}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                animationDuration={750}
              />
              <Line
                type="monotone"
                dataKey="aaaRecovery"
                name="AAA Recovery"
                stroke={theme.palette.success.main}
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 4"
                animationDuration={750}
                animationBegin={250}
              />
              <Line
                type="monotone"
                dataKey="aaRecovery"
                name="AA Recovery"
                stroke={theme.palette.info.main}
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 4"
                animationDuration={750}
                animationBegin={500}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        <Box
          sx={{
            flex: { md: '1 1 30%' },
            p: { xs: 2, sm: 3 }
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mb: 2,
              fontSize: { xs: '0.75rem', sm: '0.875rem' }
            }}
          >
            This chart visualizes your potential recovery based on exploit severity:
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
              >
                AAA tokens (dashed green) have priority recovery up to 50% severity
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
              >
                AA tokens (dashed blue) start losing value first
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
              >
                Orange line marks when one protocol is fully exploited (50%)
              </Typography>
            </Box>
            <Box component="li">
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
              >
                Red line marks when both protocols are exploited (100%)
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const WITHDRAWAL_INFO_BOX_STYLES = {
  box: {
    p: { xs: 2, sm: 3 },
    borderRadius: 2,
    bgcolor: 'primary.main08',
    border: '1px dashed',
    borderColor: 'primary.main20',
    mb: 3
  },
  infoBox: {
    display: 'flex', alignItems: 'center', gap: 1, mb: 1
  }
};

const WithdrawalInfoBox = () => {
  const theme = useTheme();

  const styles = WITHDRAWAL_INFO_BOX_STYLES;

  return (
    <Box sx={styles.box}>
      <Box sx={styles.infoBox}>
        <ErrorOutline sx={{ color: 'primary.main' }} />
        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
          Testnet Rewards Info
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        During testnet phase, APY is distributed as CoverMax tokens to reward early protocol testers.
      </Typography>
    </Box>
  );
};

const CONNECT_WALLET_PROMPT_STYLES = {
  button: {
    width: { xs: '100%', sm: 'auto' },
    px: 4,
    py: 1.5
  }
};

const ConnectWalletPrompt = ({ openConnectModal }) => {
  const styles = CONNECT_WALLET_PROMPT_STYLES;

  return (
    <ContentCard title="Welcome to CoverMax">
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
        Connect your wallet to view your portfolio and start protecting your assets
      </Typography>
      <Button
        variant="contained"
        onClick={openConnectModal}
        size="large"
        color="primary"
        sx={styles.button}
      >
        Connect Wallet
      </Button>
    </ContentCard>
  );
};

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
