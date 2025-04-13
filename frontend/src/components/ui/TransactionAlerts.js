import React, { useState, useEffect } from 'react';
import { Alert, Stack } from '@mui/material';
import PropTypes from 'prop-types';

const TransactionAlerts = ({ error, success }) => {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (success) {
      // Wait for a short delay before showing success alert to ensure transaction is confirmed
      const timer = setTimeout(() => {
        setShowSuccess(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowSuccess(false);
    }
  }, [success]);

  if (!error && !showSuccess) return null;

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      {error && <Alert severity="error">{error}</Alert>}
      {showSuccess && <Alert severity="success">{success}</Alert>}
    </Stack>
  );
};

TransactionAlerts.propTypes = {
  error: PropTypes.string,
  success: PropTypes.string
};

export default TransactionAlerts;
