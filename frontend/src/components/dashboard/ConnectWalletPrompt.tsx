import React from 'react';
import { Button, Typography } from '@mui/material';
import { ContentCard } from '../ui';

const CONNECT_WALLET_PROMPT_STYLES = {
  button: {
    width: { xs: '100%', sm: 'auto' },
    px: 4,
    py: 1.5
  }
};

interface ConnectWalletPromptProps {
  openConnectModal: () => void;
}

const ConnectWalletPrompt: React.FC<ConnectWalletPromptProps> = ({ openConnectModal }) => {
  const styles = CONNECT_WALLET_PROMPT_STYLES;

  return (
    <ContentCard title="Welcome to CoverMax">
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
        Connect your wallet to view your portfolio and start protecting your assets
      </Typography>
      <Button
        variant="contained"
        onClick={openConnectModal}
        size="large"
        color="primary"
        sx={styles.button}
      >
        Connect Wallet
      </Button>
    </ContentCard>
  );
};

export default ConnectWalletPrompt;
