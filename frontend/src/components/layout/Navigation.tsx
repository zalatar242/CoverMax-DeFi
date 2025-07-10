import React from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, Stack, Button, useTheme, useMediaQuery } from '@mui/material';

interface NavButtonProps {
  to: string;
  children: React.ReactNode;
}

const NavButton: React.FC<NavButtonProps> = ({ to, children }) => (
  <Button
    component={Link}
    to={to}
    sx={{
      color: 'text.primary',
      textTransform: 'none',
      fontWeight: 500,
      '&:hover': {
        backgroundColor: 'transparent',
        color: 'primary.main'
      }
    }}
  >
    {children}
  </Button>
);

interface MobileNavButtonProps {
  to: string;
  children: React.ReactNode;
}

const MobileNavButton: React.FC<MobileNavButtonProps> = ({ to, children }) => (
  <Button
    component={Link}
    to={to}
    variant="outlined"
    fullWidth
    sx={{
      color: 'text.primary',
      borderColor: 'divider',
      textTransform: 'none',
      fontWeight: 500,
      '&:hover': {
        borderColor: 'primary.main',
        color: 'primary.main'
      }
    }}
  >
    {children}
  </Button>
);

const Navigation: React.FC = () => {
  const theme = useTheme();
  // isMobile is used in responsive design - removing for now as it's handled by sx props

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
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
                color: 'primary.main',
                fontWeight: 700,
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                textDecoration: 'none',
                '&:hover': {
                  color: 'primary.dark'
                }
              }}
            >
              CoverMax
            </Typography>

            {/* Desktop Navigation */}
            <Stack
              direction="row"
              spacing={2}
              sx={{
                display: { xs: 'none', sm: 'flex' }
              }}
            >
              <NavButton to="/">Dashboard</NavButton>
              <NavButton to="/deposit">Deposit</NavButton>
              <NavButton to="/withdraw">Withdraw</NavButton>
              <NavButton to="/trade">Trade</NavButton>
            </Stack>
          </Box>

          {/* Mobile Navigation */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              display: { xs: 'flex', sm: 'none' },
              mt: 2,
              width: '100%'
            }}
          >
            <MobileNavButton to="/">Dashboard</MobileNavButton>
            <MobileNavButton to="/deposit">Deposit</MobileNavButton>
            <MobileNavButton to="/withdraw">Withdraw</MobileNavButton>
            <MobileNavButton to="/trade">Trade</MobileNavButton>
          </Stack>
        </Box>

        <Box >
          <appkit-button />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
