import React from 'react';
import { Card, CardContent, Typography, useTheme, useMediaQuery } from '@mui/material';
import { ContentCardProps } from '../../types/common';

const ContentCard: React.FC<ContentCardProps & { className?: string }> = ({ children, title, icon, className }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card
      elevation={0}
      className={className}
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
              },
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            {icon}
            {title}
          </Typography>
        )}
        {children}
      </CardContent>
    </Card>
  );
};

export default ContentCard;
