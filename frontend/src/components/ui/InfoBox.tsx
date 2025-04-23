import React from 'react';
import { Box, Typography, Stack, useTheme, Theme } from '@mui/material';

interface InfoBoxProps {
  title: string;
  items: string[];
}

const InfoBox: React.FC<InfoBoxProps> = ({ title, items }) => {
  const theme: Theme = useTheme();

  return (
    <Box sx={{
      bgcolor: (theme) => `${theme.palette.primary.main}08`,
      p: { xs: 2, sm: 3 },
      borderRadius: 2,
      border: (theme) => `1px solid ${theme.palette.primary.main}10`
    }}>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          mb: { xs: 1.5, sm: 2 },
          color: 'text.primary',
          fontSize: {
            xs: '1rem',
            sm: '1.125rem'
          }
        }}
      >
        {title}
      </Typography>
      <Stack spacing={{ xs: 1, sm: 2 }}>
        {items.map((item, index) => (
          <Typography
            key={index}
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: {
                xs: '0.875rem',
                sm: '0.9375rem'
              },
              lineHeight: 1.5
            }}
          >
            • {item}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
};

export default InfoBox;
