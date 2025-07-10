import React from 'react';
import { Box, Typography } from '@mui/material';
import { formatUSDC } from '../../utils/analytics';

interface PayloadItem {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: PayloadItem[];
  label?: number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const totalRecovery = payload[0]?.value || 0;
  const aaaRecovery = payload[1]?.value || 0;
  const aaRecovery = payload[2]?.value || 0;

  return (
    <Box
      sx={{
        p: 1.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        maxWidth: '200px',
        boxShadow: 1
      }}
    >
      <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
        Exploit Severity: {(label ? label * 100 : 0).toFixed(0)}%
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: 'primary.main',
          fontSize: { xs: '0.75rem', sm: '0.875rem' },
          mb: 0.5
        }}
      >
        Total Recovery: {formatUSDC(totalRecovery)}
      </Typography>
      {payload[1] && (
        <Typography
          variant="body2"
          sx={{
            color: 'success.main',
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            mb: 0.5
          }}
        >
          AAA Recovery: {formatUSDC(aaaRecovery)}
        </Typography>
      )}
      {payload[2] && (
        <Typography
          variant="body2"
          sx={{
            color: 'info.main',
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }}
        >
          AA Recovery: {formatUSDC(aaRecovery)}
        </Typography>
      )}
    </Box>
  );
};

export default CustomTooltip;
