import React from 'react';
import { Box, Typography, Button, Card, CardContent, Alert, Stack, TextField, Grid } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { colors, cardStyles, buttonStyles } from '../utils/theme';

export const PageContainer = ({ children }) => (
  <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, sm: 3, md: 4 } }}>
    {children}
  </Box>
);

export const BackButton = () => {
  const navigate = useNavigate();
  return (
    <Button
      startIcon={<ArrowBack />}
      onClick={() => navigate(-1)}
      sx={{ mb: 3, color: colors.text }}
    >
      Back to Dashboard
    </Button>
  );
};

export const ContentCard = ({ children, title }) => (
  <Card elevation={0} sx={cardStyles}>
    <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {title && (
        <Typography variant="h5" sx={{ color: colors.text, fontWeight: 600, mb: 3 }}>
          {title}
        </Typography>
      )}
      {children}
    </CardContent>
  </Card>
);

export const WalletRequiredCard = ({ title, onConnect }) => (
  <ContentCard>
    <CardContent sx={{ textAlign: 'center' }}>
      <Typography variant="h5" sx={{ color: colors.text, fontWeight: 600, mb: 3 }}>
        {title || 'Connect Wallet to Continue'}
      </Typography>
      <Button
        variant="contained"
        onClick={onConnect}
        sx={buttonStyles.primary}
      >
        Connect Wallet
      </Button>
    </CardContent>
  </ContentCard>
);

export const TransactionAlerts = ({ error, success }) => {
  const [showSuccess, setShowSuccess] = React.useState(false);

  React.useEffect(() => {
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

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      {error && <Alert severity="error">{error}</Alert>}
      {showSuccess && <Alert severity="success">{success}</Alert>}
    </Stack>
  );
};

export const ProtocolBox = ({ protocols }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600, mb: 2 }}>
      Your Deposit Distribution
    </Typography>
    <Grid container spacing={2}>
      {protocols.map((protocol) => (
        <Grid item xs={12} sm={4} key={protocol.name}>
          <Card sx={{
            p: 2,
            bgcolor: `${colors.primary}08`,
            border: `1px solid ${colors.primary}22`,
            height: '100%'
          }}>
            <Stack spacing={1}>
              <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600 }}>
                {protocol.name}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textLight }}>
                {protocol.description}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.primary, fontWeight: 500 }}>
                Distribution: {protocol.distribution}
              </Typography>
            </Stack>
          </Card>
        </Grid>
      ))}
    </Grid>
  </Box>
);

export const InfoBox = ({ title, items }) => (
  <Box sx={{ bgcolor: `${colors.primary}08`, p: 3, borderRadius: 2 }}>
    <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600, mb: 2 }}>
      {title}
    </Typography>
    <Stack spacing={2}>
      {items.map((item, index) => (
        <Typography key={index} variant="body2" sx={{ color: colors.textLight }}>
          • {item}
        </Typography>
      ))}
    </Stack>
  </Box>
);

export const AmountField = ({
  amount,
  setAmount,
  validateAmount,
  setError,
  maxAmount,
  label = "Amount"
}) => (
  <TextField
    fullWidth
    label={label}
    value={amount}
    onChange={(e) => {
      const value = e.target.value;
      // Only allow numbers and decimal point
      if (value && !/^\d*\.?\d*$/.test(value)) {
        return;
      }
      setAmount(value);
    }}
    onBlur={() => {
      // Validate on blur for better UX
      if (amount) {
        const numValue = parseFloat(amount);
        if (isNaN(numValue) || numValue === 0) {
          setError('Please enter a valid amount');
        } else {
          setAmount(numValue.toString()); // Clean up the input
        }
      }
    }}
    placeholder="0.00"
    InputProps={{
      endAdornment: maxAmount !== undefined && (
        <Button
          size="small"
          onClick={() => {
            const roundedAmount = Math.floor(maxAmount / 3) * 3;
            setAmount(roundedAmount.toString());
          }}
          sx={{ color: colors.primary }}
        >
          MAX
        </Button>
      )
    }}
    sx={{ mb: 2 }}
  />
);
