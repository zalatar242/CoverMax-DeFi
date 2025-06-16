import React, { useState } from 'react';
import { Button, Stack, Typography, Box, Paper } from '@mui/material';
import { useWalletConnection, useWalletModal } from '../utils/walletConnector';
import { useMainConfig, useTranchesConfig } from '../utils/contractConfig';
import { ContentCard } from '../components/ui';
import TokenPrice from '../components/trade/TokenPrice';
import LiquidityPosition from '../components/trade/LiquidityPosition';
import SwapTab from '../components/trade/SwapTab';
import AddLiquidityTab from '../components/trade/AddLiquidityTab';
import RemoveLiquidityTab from '../components/trade/RemoveLiquidityTab';

const WalletRequiredPrompt = ({ openConnectModal }) => (
  <ContentCard title="Connect Wallet to Trade">
    <Button
      variant="contained"
      onClick={openConnectModal}
      size="large"
      fullWidth
      sx={{
        py: 1.5,
        px: 4
      }}
    >
      Connect Wallet
    </Button>
  </ContentCard>
);

const Trade = () => {
  const { isConnected } = useWalletConnection();
  const { openConnectModal } = useWalletModal();
  const { AAA, AA } = useTranchesConfig();
  const [activeTab, setActiveTab] = useState('swap'); // 'swap', 'addLiquidity', 'removeLiquidity'
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTransactionSuccess = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  if (!isConnected) {
    return <WalletRequiredPrompt openConnectModal={openConnectModal} />;
  }

  return (
    <Stack spacing={3}>
      {/* Token Prices */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Current Prices</Typography>
        <Stack spacing={1}>
          {AAA?.address && <TokenPrice key={`aaa-price-${refreshKey}`} token={AAA.address} symbol="AAA" />}
          {AA?.address && <TokenPrice key={`aa-price-${refreshKey}`} token={AA.address} symbol="AA" />}
        </Stack>
      </Paper>

      {/* Your Liquidity Positions */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Your Liquidity Positions</Typography>
        {AAA?.address && <LiquidityPosition key={`aaa-lp-${refreshKey}`} token={AAA.address} symbol="AAA" />}
        {AA?.address && <LiquidityPosition key={`aa-lp-${refreshKey}`} token={AA.address} symbol="AA" />}
      </Paper>

            {/* Navigation Tabs */}
            <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2}>
          <Button
            variant={activeTab === 'swap' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('swap')}
          >
            Swap
          </Button>
          <Button
            variant={activeTab === 'addLiquidity' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('addLiquidity')}
          >
            Add Liquidity
          </Button>
          <Button
            variant={activeTab === 'removeLiquidity' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('removeLiquidity')}
          >
            Remove Liquidity
          </Button>
        </Stack>
      </Box>

      {activeTab === 'swap' && <SwapTab onTransactionSuccess={handleTransactionSuccess} />}
      {activeTab === 'addLiquidity' && <AddLiquidityTab onTransactionSuccess={handleTransactionSuccess} />}
      {activeTab === 'removeLiquidity' && <RemoveLiquidityTab onTransactionSuccess={handleTransactionSuccess} />}
    </Stack>
  );
};

export default Trade;
