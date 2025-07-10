import React from 'react';
import { TextField, Button, Box, useTheme, useMediaQuery } from '@mui/material';

interface AmountFieldProps {
  amount: string;
  setAmount: (value: string) => void;
  setError: (error: string) => void;
  maxAmount: number;
  label?: string;
  disabled?: boolean;
  validateAmount?: (value: string) => boolean;
}

const AmountField: React.FC<AmountFieldProps> = ({
  amount,
  setAmount,
  setError,
  maxAmount,
  label = "Amount",
  disabled = false,
  validateAmount
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimal point
    if (value && !/^\d*\.?\d*$/.test(value)) {
      return;
    }
    setAmount(value);
  };

  const handleBlur = () => {
    if (amount) {
      const numValue = parseFloat(amount);
      if (isNaN(numValue) || numValue === 0) {
        setError('Please enter a valid amount');
      } else {
        setAmount(numValue.toString()); // Clean up the input
      }
    }
  };

  const handleMax = () => {
    if (maxAmount !== undefined) {
      // Round to 3 decimal places for better UX
      const roundedAmount = Math.floor(maxAmount * 1000) / 1000;
      setAmount(roundedAmount.toString());
    }
  };

  return (
    <Box sx={{
      position: 'relative',
      mb: { xs: 2, sm: 2.5 }
    }}>
      <TextField
        fullWidth
        label={label}
        value={amount}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder="0.00"
        InputProps={{
          endAdornment: maxAmount !== undefined && (
            <Button
              size={isMobile ? "small" : "medium"}
              onClick={handleMax}
              sx={{
                color: 'primary.main',
                minWidth: { xs: '60px', sm: '70px' },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: { xs: 0.5, sm: 0.75 }
              }}
            >
              MAX
            </Button>
          )
        }}
        sx={{
          '& .MuiInputBase-root': {
            fontSize: { xs: '1rem', sm: '1.1rem' },
          },
          '& .MuiInputLabel-root': {
            fontSize: { xs: '0.9rem', sm: '1rem' },
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: { xs: 1.5, sm: 2 }
          }
        }}
      />
    </Box>
  );
};

export default AmountField;
