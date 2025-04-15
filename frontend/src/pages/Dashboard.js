import React from 'react';
import {
  Button,
  Stack,
  Typography,
  Box,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import { AccountBalance, SwapHoriz, ErrorOutline, InfoOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { formatUSDC, calculatePercentage } from '../utils/analytics';
import { usePortfolioData, useProtocolStatus, useUSDCBalance } from '../utils/contracts';
import { ContentCard } from '../components/ui';

const WithdrawalInfoBox = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        bgcolor: `${theme.palette.primary.main}08`,
        border: '1px dashed',
        borderColor: `${theme.palette.primary.main}20`,
        mb: 3,
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 2
      }}
    >
      <ErrorOutline sx={{ color: 'primary.main', mt: { xs: 0.5, sm: 0 } }} />
      <Box>
        <Typography variant="body2" sx={{
          color: 'text.primary',
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
          {['AAA', 'AA'].map((tranche, index) => (
            <Box key={tranche}>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: `${theme.palette.primary.main}10`,
                  color: 'primary.main',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Tranche {tranche}
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {index === 0 ? 'First' : 'Second'}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

const ConnectWalletPrompt = ({ openConnectModal }) => (
  <ContentCard title="Welcome to CoverMax">
    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
      Connect your wallet to view your portfolio and start protecting your assets
    </Typography>
    <Button
      variant="contained"
      onClick={openConnectModal}
      size="large"
      color="primary"
      sx={{
        width: { xs: '100%', sm: 'auto' },
        px: 4,
        py: 1.5
      }}
    >
      Connect Wallet
    </Button>
  </ContentCard>
);

const TrancheSummary = ({ title, value, total }) => (
  <Box
    sx={{
      height: '100%',
      p: { xs: 2, sm: 3 },
      borderRadius: 2,
      bgcolor: (theme) => `${theme.palette.primary.main}08`,
      border: '1px solid',
      borderColor: (theme) => `${theme.palette.primary.main}20`
    }}
  >
    <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 500, mb: 2 }}>
      Tranche {title}
    </Typography>
    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>
      {formatUSDC(value)}
    </Typography>
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {calculatePercentage(value, total)} of portfolio
    </Typography>
  </Box>
);

const ProtocolTVLSummary = ({ name, value, tvl, description }) => (
  <Box
    sx={{
      height: '100%',
      p: { xs: 2, sm: 3 },
      borderRadius: 2,
      bgcolor: (theme) => `${theme.palette.primary.main}08`,
      border: '1px solid',
      borderColor: (theme) => `${theme.palette.primary.main}20`
    }}
  >
    <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>
      {name}
    </Typography>
    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>
      {formatUSDC(value)}
    </Typography>
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {calculatePercentage(value, tvl.total)} of TVL
    </Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
      {description}
    </Typography>
  </Box>
);

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

  const totalValue = parseFloat(trancheAAA) + parseFloat(trancheAA);

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
            </Typography>
            <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {formatUSDC(totalValue)}
            </Typography>
          </Box>
          <Divider orientation={isTablet ? 'horizontal' : 'vertical'} flexItem />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 500, mb: 1 }}>
              Available USDC
            </Typography>
            <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {formatUSDC(usdcBalance)}
            </Typography>
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
            <TrancheSummary title="AAA" value={trancheAAA} total={totalValue} />
            <TrancheSummary title="AA" value={trancheAA} total={totalValue} />
          </Box>
          <WithdrawalInfoBox />
        </Box>
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(phases).map(([key, phase]) => (
                <Tooltip
                  key={key}
                  title={
                    phase.name === "Deposit Phase (2 days)" ?
                      "2-day window to deposit USDC into the protocol. Your deposits are split into two tranches (AAA, AA) each with different risk/reward profiles." :
                    phase.name === "Insurance Phase (5 days)" ?
                      "5-day period where your deposits are protected and earning yield across Aave and Moonwell lending protocols." :
                    phase.name === "Withdrawal Phase (3 days)" ?
                      "3-day window to withdraw your funds. Withdrawals are processed in order of tranche priority: AAA (lowest risk) first, then AA (higher risk)." :
                    ""
                  }
                  arrow
                  placement="right"
                >
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: status === phase.name ? (theme) => `${theme.palette.primary.main}08` : 'transparent',
                      border: '1px solid',
                      borderColor: status === phase.name ?
                        (theme) => `${theme.palette.primary.main}20` :
                        'divider',
                      cursor: 'help',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: (theme) => `${theme.palette.primary.main}15`
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          color: status === phase.name ? 'primary.main' : 'text.primary',
                          fontWeight: status === phase.name ? 600 : 500
                        }}
                      >
                        {phase.name}
                      </Typography>
                      <InfoOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      {phase.start.toLocaleDateString()} - {phase.end ? phase.end.toLocaleDateString() : 'End'}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
            </Box>
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
            <ProtocolTVLSummary
              name="Aave"
              value={tvl.total / 2}
              tvl={tvl}
              description="Industry-leading lending protocol with robust security"
            />
            <ProtocolTVLSummary
              name="Moonwell"
              value={tvl.total / 2}
              tvl={tvl}
              description="Innovative Base protocol with competitive rates"
            />
          </Box>
        </Box>
      </ContentCard>
    </Box>
  );
};

export default Dashboard;
