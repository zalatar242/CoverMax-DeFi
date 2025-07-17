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
import { formatUSDC, calculatePercentage } from '../utils/analytics';
import {
  usePortfolioData,
  useProtocolStatus,
  useUSDCBalance
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
      <ContentCard title="Dashboard">
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

        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 500, mb: 1 }}>
            Total Portfolio Value
            <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
              • Available USDC: {formatUSDC(usdcBalance)}
            </Typography>
          </Typography>
          <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 600 }}>
            {formatUSDC(totalValue)}
          </Typography>
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
              value={(parseFloat(tvl.total) / 2).toString()}
              valueFormatter={formatUSDC}
              description="Industry-leading lending protocol with robust security"
            />
            <SummaryBox
              title="Moonwell"
              value={(parseFloat(tvl.total) / 2).toString()}
              valueFormatter={formatUSDC}
              description="Innovative lending protocol with competitive rates"
            />
          </Box>
        </Box>
      </ContentCard>

    </Box>
  );
};

export default Dashboard;
