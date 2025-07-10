import React from 'react';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';

interface Token {
  address: string;
  symbol: string;
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
        onChange={(e) => onTokenChange(e.target.value)}
        label={label}
      >
        {tokens.map((t: Token) => (
          <MenuItem key={t.symbol} value={t.address}>
            {t.symbol}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default TokenSelect;
