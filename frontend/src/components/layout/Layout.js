import React from 'react';
import { Container, Box, useTheme, useMediaQuery } from '@mui/material';
import PropTypes from 'prop-types';
import Navigation from './Navigation';

const Layout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      bgcolor: 'background.default'
    }}>
      <Navigation />
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
        <Box sx={{
          maxWidth: isMobile ? '100%' : '95%',
          mx: 'auto',
          width: '100%'
        }}>
          {children}
        </Box>
      </Container>
    </Box>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired
};

export default Layout;
