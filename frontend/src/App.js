import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  useTheme,
} from '@mui/material';
import { AppKitProvider } from './utils/walletConnector';

// Pages
import Dashboard from './pages/Dashboard';

// Custom theme colors
const colors = {
  primary: '#FF385C',
  text: '#484848',
  textLight: '#767676',
  border: '#EBEBEB'
};

const AppContent = () => {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#F7F7F7' }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'white',
          borderBottom: `1px solid ${colors.border}`,
          mb: 2
        }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              color: colors.primary,
              fontWeight: 700,
              fontSize: '1.5rem'
            }}
          >
            CoverMax
          </Typography>
          <Box sx={{
            '& appkit-button::part(button)': {
              color: colors.text,
              borderColor: colors.border,
              borderRadius: '8px',
              padding: '8px 16px',
              textTransform: 'none',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: theme.typography.fontFamily,
              '&:hover': {
                borderColor: colors.text
              }
            }
          }}>
            <appkit-button />
          </Box>
        </Toolbar>
      </AppBar>

      <Container component="main" sx={{ flex: 1 }}>
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
