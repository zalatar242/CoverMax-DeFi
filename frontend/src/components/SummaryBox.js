import React from 'react';
import {
  Typography,
  Box,
  useTheme,
} from '@mui/material';

const SummaryBox = ({ title, value, description, valueFormatter, descriptionFormatter }) => {
  const theme = useTheme();

  const styles = {
    box: {
      height: '100%',
      p: { xs: 2, sm: 3 },
      borderRadius: 2,
      bgcolor: theme.palette.primary.main + '08',
      border: '1px solid',
      borderColor: theme.palette.primary.main + '20'
    }
  };

  return (
    <Box sx={styles.box}>
      <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>
        {valueFormatter ? valueFormatter(value) : value}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {descriptionFormatter ? descriptionFormatter(description) : description}
        </Typography>
      )}
    </Box>
  );
};

export default SummaryBox;
