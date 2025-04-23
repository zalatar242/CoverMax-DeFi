import React from 'react';
import { Select, MenuItem, FormControl, InputLabel, SelectChangeEvent } from '@mui/material';

interface Token {
  symbol: string;
  address: string;
}

interface TokenSelectProps {
  token: string;
  onTokenChange: (value: string) => void;
  tokens: Token[];
  label: string;
}

const TokenSelect: React.FC<TokenSelectProps> = ({ token, onTokenChange, tokens, label }) => {
  return (
    <FormControl fullWidth sx={{ mb: 2 }}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={token}
        onChange={(e: SelectChangeEvent) => onTokenChange(e.target.value)}
        label={label}
      >
        {tokens.map((t) => (
          <MenuItem key={t.symbol} value={t.address}>
            {t.symbol}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default TokenSelect;
