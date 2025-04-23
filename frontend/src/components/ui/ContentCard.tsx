import React from 'react';
import { Box, Typography, Card, useTheme, useMediaQuery } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

interface ContentCardProps {
  children: ReactNode;
  title: string;
  icon?: ReactNode;
}

const ContentCard: React.FC<ContentCardProps> = ({ children, title, icon }) => {
  const theme: Theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card sx={{
      p: { xs: 2, sm: 3 },
      borderRadius: 2,
      boxShadow: 'none',
      border: (theme) => `1px solid ${theme.palette.divider}`
    }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {title}
        </Typography>
        {icon}
      </Box>
      {children}
    </Card>
  );
};

export default ContentCard;
