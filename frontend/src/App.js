import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  AccountBalance as DepositIcon,
  Folder as PortfolioIcon,
  Assessment as AnalyticsIcon
} from '@mui/icons-material';
import { ethers } from 'ethers';

// Pages
import Dashboard from './pages/Dashboard';
import Deposit from './pages/Deposit';
import Portfolio from './pages/Portfolio';
import Analytics from './pages/Analytics';

const App = () => {
  const [account, setAccount] = useState(null);
  const [isMetaMaskInstalled] = useState(!!window.ethereum);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const connectWallet = async () => {
    if (!window.ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
    } catch (error) {
      console.error("User denied account access");
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Deposit', icon: <DepositIcon />, path: '/deposit' },
    { text: 'Portfolio', icon: <PortfolioIcon />, path: '/portfolio' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' }
  ];

  const drawer = (
    <Box sx={{ mt: 2 }}>
      <List>
        {menuItems.map((item) => (
          <ListItem button key={item.text} component="a" href={item.path}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Router>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static">
          <Toolbar>
            {isMobile && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              OpenCover
            </Typography>
            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 2, mr: 2 }}>
                {menuItems.map((item) => (
                  <Button
                    key={item.text}
                    color="inherit"
                    href={item.path}
                    startIcon={item.icon}
                  >
                    {item.text}
                  </Button>
                ))}
              </Box>
            )}
            {account ? (
              <Typography variant="body2">
                {account.slice(0, 6)}...{account.slice(-4)}
              </Typography>
            ) : (
              <Button
                color="inherit"
                onClick={connectWallet}
                disabled={!isMetaMaskInstalled}
                title={!isMetaMaskInstalled ? "Please install MetaMask" : ""}
              >
                {isMetaMaskInstalled ? "Connect Wallet" : "Install MetaMask"}
              </Button>
            )}
          </Toolbar>
        </AppBar>

        {isMobile && (
          <Drawer
            variant="temporary"
            anchor="left"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true // Better mobile performance
            }}
          >
            {drawer}
          </Drawer>
        )}

        <Container component="main" sx={{ flex: 1, py: 4 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </Container>
      </Box>
    </Router>
  );
};

export default App;
