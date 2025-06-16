import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CircularProgress, Box } from '@mui/material';
import { AppKitProvider } from './utils/walletConnector';
import theme from './utils/theme';
import Layout from './components/layout/Layout';

// Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Deposit = lazy(() => import('./pages/Deposit'));
const Withdraw = lazy(() => import('./pages/Withdraw'));
const Trade = lazy(() => import('./pages/Trade'));

const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

const App = () => {
  return (
    <Router>
      <ThemeProvider theme={theme}>
        <AppKitProvider>
          <Layout>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/deposit" element={<Deposit />} />
                <Route path="/withdraw" element={<Withdraw />} />
                <Route path="/trade" element={<Trade />} />
              </Routes>
            </Suspense>
          </Layout>
        </AppKitProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
