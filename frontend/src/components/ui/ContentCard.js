import React from 'react';
import { Card, CardContent, Typography, useTheme, useMediaQuery } from '@mui/material';
import PropTypes from 'prop-types';

const ContentCard = ({ children, title }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card
      elevation={0}
      sx={{
        mb: { xs: 2, sm: 3 },
        overflow: 'visible'
      }}
    >
      <CardContent sx={{
        p: { xs: 2, sm: 3, md: 4 },
        '&:last-child': { pb: { xs: 3, sm: 4 } }
      }}>
        {title && (
          <Typography
            variant={isMobile ? 'h6' : 'h5'}
            sx={{
              fontWeight: 600,
              mb: { xs: 2, sm: 3 },
              color: 'text.primary',
              fontSize: {
                xs: '1.125rem',
                sm: '1.25rem',
                md: '1.5rem'
              }
            }}
          >
            {title}
          </Typography>
        )}
        {children}
      </CardContent>
    </Card>
  );
};

ContentCard.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string
};

export default ContentCard;
