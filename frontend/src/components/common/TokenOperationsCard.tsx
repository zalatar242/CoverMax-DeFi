import React from 'react';
import { Button, Stack, CircularProgress, Typography, Box } from '@mui/material';
import { formatUnits } from 'viem';
import { ContentCard, TransactionAlerts } from '../ui';

interface TokenOperation {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'contained' | 'outlined';
  color?: 'primary' | 'secondary';
  icon?: React.ReactNode;
}

interface TokenOperationsCardProps {
  title: string;
  children: React.ReactNode;
  errors?: Record<string, string>;
  successes?: Record<string, string>;
  selectedToken: any;
  tokenData: any;
  tokenSymbol: string;
  operations?: TokenOperation[];
  className?: string;
}

const TokenOperationsCard: React.FC<TokenOperationsCardProps> = ({
  title,
  children,
  errors = {},
  successes = {},
  selectedToken,
  tokenData,
  tokenSymbol,
  operations = [],
  className
}) => {
  const combinedError = Object.values(errors).filter(Boolean).join(', ');
  const combinedSuccess = Object.values(successes).filter(Boolean).join(', ');

  return (
    <ContentCard title={title} className={className}>
      <TransactionAlerts
        error={combinedError}
        success={combinedSuccess}
      />

      <Stack spacing={3}>
        {children}

        {tokenData && selectedToken && (
          <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, mb: 1 }}>
              Your Balance: {formatUnits(tokenData.balance, tokenData.decimals)} {tokenSymbol}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Your Allowance: {formatUnits(tokenData.allowance, tokenData.decimals)} {tokenSymbol}
            </Typography>
          </Box>
        )}

        {operations.length > 0 && (
          <Stack direction="row" spacing={2}>
            {operations.map((operation, index) => (
              <Button
                key={index}
                fullWidth
                variant={operation.variant || "outlined"}
                onClick={operation.onClick}
                disabled={operation.disabled}
                startIcon={operation.loading ? <CircularProgress size={24} /> : operation.icon}
                color={operation.color || "primary"}
              >
                {operation.label}
              </Button>
            ))}
          </Stack>
        )}
      </Stack>
    </ContentCard>
  );
};

export default TokenOperationsCard;
