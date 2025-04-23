import React, { useState, useEffect } from 'react';
import { Alert, Stack } from '@mui/material';

interface TransactionAlertsProps {
  error?: string;
  success?: string;
}

const TransactionAlerts: React.FC<TransactionAlertsProps> = ({ error, success }) => {
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  useEffect((): (() => void) => {
    if (success) {
      // Wait for a short delay before showing success alert to ensure transaction is confirmed
      const timer = setTimeout(() => {
        setShowSuccess(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowSuccess(false);
      return () => {}; // Empty cleanup function when no timer is set
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

export default TransactionAlerts;
