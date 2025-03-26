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
} from '@mui/material';
import { AppKitProvider } from './utils/walletConnector';

// Pages
import Dashboard from './pages/Dashboard';

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
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
          py: { xs: 1, sm: 0 }
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
