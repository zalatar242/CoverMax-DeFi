import React from 'react';
import { Box, Typography, Card, Grid, Stack, useTheme } from '@mui/material';
import PropTypes from 'prop-types';

const ProtocolCard = ({ protocol }) => {
  const theme = useTheme();

  return (
    <Card sx={{
      p: { xs: 2, sm: 2.5, md: 3 },
      bgcolor: (theme) => `${theme.palette.primary.main}08`,
      border: (theme) => `1px solid ${theme.palette.primary.main}22`,
      height: '100%',
      boxShadow: 'none',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Stack spacing={1}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            fontSize: {
              xs: '1rem',
              sm: '1.125rem',
              md: '1.25rem'
            }
          }}
        >
          {protocol.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontSize: {
              xs: '0.875rem',
              sm: '0.9375rem'
            },
            flex: 1,
            mb: 1
          }}
        >
          {protocol.description}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'primary.main',
            fontWeight: 500,
            fontSize: {
              xs: '0.875rem',
              sm: '0.9375rem'
            }
          }}
        >
          Distribution: {protocol.distribution}
        </Typography>
      </Stack>
    </Card>
  );
};

ProtocolCard.propTypes = {
  protocol: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    distribution: PropTypes.string.isRequired
  }).isRequired
};

const ProtocolBox = ({ protocols, title = "Your Deposit Distribution" }) => (
  <Box sx={{ mb: { xs: 3, sm: 4 } }}>
    <Typography
      variant="h6"
      sx={{
        fontWeight: 600,
        color: 'text.primary',
        mb: { xs: 2, sm: 2.5 },
        fontSize: {
          xs: '1.125rem',
          sm: '1.25rem'
        }
      }}
    >
      {title}
    </Typography>
    <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
      {protocols.map((protocol) => (
        <Grid
          item
          xs={12}
          sm={4}
          key={protocol.name}
          sx={{
            display: 'flex'
          }}
        >
          <ProtocolCard protocol={protocol} />
        </Grid>
      ))}
    </Grid>
  </Box>
);

ProtocolBox.propTypes = {
  protocols: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      distribution: PropTypes.string.isRequired
    })
  ).isRequired,
  title: PropTypes.string
};

export default ProtocolBox;
