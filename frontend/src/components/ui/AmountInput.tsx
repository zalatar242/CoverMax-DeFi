import React from 'react';
import { TextField, Typography } from '@mui/material';
import { useAmountForm } from '../../utils/useAmountForm';
import { formatUnits } from 'viem';

interface AmountInputProps {
  maxAmount: number;
  amount: string;
  setAmount: (value: string) => void;
  errorMessage?: string;
  decimals: number;
  symbol: string;
}

const AmountInput: React.FC<AmountInputProps> = ({
  maxAmount,
  amount,
  setAmount,
  errorMessage,
  decimals,
  symbol
}) => {
  const { validateAmount } = useAmountForm(0n, 2, decimals);

  return (
    <div>
      <TextField
        fullWidth
        label="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={!!errorMessage}
        helperText={errorMessage}
      />
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
        Available Balance: {maxAmount} {symbol}
      </Typography>
    </div>
  );
};

export default AmountInput;
