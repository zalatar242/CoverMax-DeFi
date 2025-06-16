import React from 'react';
import { Box, Typography } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';
import { useTheme } from '@mui/material';

const WITHDRAWAL_INFO_BOX_STYLES = {
  box: {
    p: { xs: 2, sm: 3 },
    borderRadius: 2,
    bgcolor: 'primary.main08',
    border: '1px dashed',
    borderColor: 'primary.main20',
    mb: 3
  },
  infoBox: {
    display: 'flex', alignItems: 'center', gap: 1, mb: 1
  }
};

const WithdrawalInfoBox = () => {
  const theme = useTheme(); // theme is used in styles, so keep it if styles are complex or theme-dependent
  const styles = WITHDRAWAL_INFO_BOX_STYLES;

  return (
    <Box sx={styles.box}>
      <Box sx={styles.infoBox}>
        <ErrorOutline sx={{ color: 'primary.main' }} />
        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
          Testnet Rewards Info
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        During testnet phase, APY is distributed as CoverMax tokens to reward early protocol testers.
      </Typography>
    </Box>
  );
};

export default WithdrawalInfoBox;
