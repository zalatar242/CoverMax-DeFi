import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { AppKitProvider } from './utils/walletConnector';
import theme from './utils/theme';
import Layout from './components/layout/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Trade from './pages/Trade';

const App = () => {
  return (
    <Router>
      <ThemeProvider theme={theme}>
        <AppKitProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/deposit" element={<Deposit />} />
              <Route path="/withdraw" element={<Withdraw />} />
              <Route path="/trade" element={<Trade />} />
            </Routes>
          </Layout>
        </AppKitProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
