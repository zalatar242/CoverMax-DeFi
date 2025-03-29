import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  useTheme,
  useMediaQuery,
  Stack,
  Button,
} from '@mui/material';
import { AppKitProvider } from './utils/walletConnector';

// Pages
import Dashboard from './pages/Dashboard';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';

// Custom theme colors - Stripe-inspired with purple accent
const colors = {
  primary: '#9097ff',
  primaryDark: '#7A82FF',
  text: '#3D4168',
  textLight: '#6B7C93',
  background: '#F6F9FC',
  border: '#E6E9F0'
};

const AppContent = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      bgcolor: colors.background
    }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'white',
          borderBottom: `1px solid ${colors.border}`,
          py: { xs: 1, sm: 0 }
        }}
      >
        <Toolbar sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexDirection: 'row',
          gap: { xs: 2, sm: 0 },
          py: { xs: 1, sm: 0 },
          flexWrap: { xs: 'wrap', sm: 'nowrap' }
        }}>
          <Box sx={{ width: '100%' }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              justifyContent: { xs: 'center', sm: 'flex-start' }
            }}>
              <Typography
                variant="h6"
                component={Link}
                to="/"
                sx={{
                  color: colors.primary,
                  fontWeight: 700,
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                  textDecoration: 'none',
                  '&:hover': {
                    color: colors.primaryDark
                  }
                }}
              >
                CoverMax
              </Typography>
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  display: { xs: 'none', sm: 'flex' }
                }}
              >
                <Button
                  component={Link}
                  to="/"
                  sx={{
                    color: colors.text,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: 'transparent',
                      color: colors.primary
                    }
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  component={Link}
                  to="/deposit"
                  sx={{
                    color: colors.text,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: 'transparent',
                      color: colors.primary
                    }
                  }}
                >
                  Deposit
                </Button>
                <Button
                  component={Link}
                  to="/withdraw"
                  sx={{
                    color: colors.text,
                    textTransform: 'none',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: 'transparent',
                      color: colors.primary
                    }
                  }}
                >
                  Withdraw
                </Button>
              </Stack>
            </Box>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                display: { xs: 'flex', sm: 'none' },
                mt: 2,
                width: '100%'
              }}
            >
              <Button
                component={Link}
                to="/"
                variant="outlined"
                fullWidth
                sx={{
                  color: colors.text,
                  borderColor: colors.border,
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    borderColor: colors.primary,
                    color: colors.primary
                  }
                }}
              >
                Dashboard
              </Button>
              <Button
                component={Link}
                to="/deposit"
                variant="outlined"
                fullWidth
                sx={{
                  color: colors.text,
                  borderColor: colors.border,
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    borderColor: colors.primary,
                    color: colors.primary
                  }
                }}
              >
                Deposit
              </Button>
              <Button
                component={Link}
                to="/withdraw"
                variant="outlined"
                fullWidth
                sx={{
                  color: colors.text,
                  borderColor: colors.border,
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    borderColor: colors.primary,
                    color: colors.primary
                  }
                }}
              >
                Withdraw
              </Button>
            </Stack>
          </Box>
          <Box sx={{
            width: { xs: '100%', sm: 'auto' },
            '& appkit-button': {
              width: { xs: '100%', sm: 'auto' },
            },
            '& appkit-button::part(button)': {
              color: colors.text,
              borderColor: colors.border,
              borderRadius: '8px',
              padding: '8px 16px',
              textTransform: 'none',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: theme.typography.fontFamily,
              width: { xs: '100%', sm: 'auto' },
              '&:hover': {
                borderColor: colors.text
              }
            }
          }}>
            <appkit-button />
          </Box>
        </Toolbar>
      </AppBar>

      <Container
        component="main"
        sx={{
          flex: 1,
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
          maxWidth: {
            xs: '100%',
            sm: '600px',
            md: '900px',
            lg: '1200px'
          }
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/withdraw" element={<Withdraw />} />
        </Routes>
      </Container>
    </Box>
  );
};

const App = () => {
  return (
    <Router>
      <AppKitProvider>
        <AppContent />
      </AppKitProvider>
    </Router>
  );
};

export default App;
