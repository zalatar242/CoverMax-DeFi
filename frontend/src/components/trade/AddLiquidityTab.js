import React, { useState } from 'react';
import { Button, Stack, CircularProgress, Typography } from '@mui/material';
import { Pool } from '@mui/icons-material';
import { useWalletConnection } from '../../utils/walletConnector';
import { useMainConfig, useTranchesConfig } from '../../utils/contractConfig';
import { useWriteContract, useReadContract, useConfig } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { formatUnits } from 'viem';
import { useTransaction } from '../../utils/useTransaction';
import { useAmountForm } from '../../utils/useAmountForm';
import {
  ContentCard,
  AmountField,
  TransactionAlerts,
  TokenSelect
} from '../ui';

const AddLiquidityTab = () => {
  const { isConnected, address } = useWalletConnection();
  const { USDC, UniswapV2Router02 } = useMainConfig();
  const wagmiConfig = useConfig();
  const { AAA, AA } = useTranchesConfig();

  const [selectedLiquidityToken, setSelectedLiquidityToken] = useState('');

  const { data: liquidityTokenDecimals = 6 } = useReadContract({
    address: selectedLiquidityToken,
    abi: ['function decimals() view returns (uint8)'],
    functionName: 'decimals',
    enabled: Boolean(selectedLiquidityToken),
  });

  const { data: liquidityTokenBalance = 0n } = useReadContract({
    address: selectedLiquidityToken,
    abi: ['function balanceOf(address) view returns (uint256)'],
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && selectedLiquidityToken && isConnected),
  });

  const { data: usdcBalance = 0n } = useReadContract({
    address: USDC?.address,
    abi: USDC?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && USDC && isConnected),
  });

  // It would be good to also read the LP token balance for this pair if the user already has some
  // This is for display/information purposes, not directly used in add liquidity logic here
  // const { data: currentLPBalance, refetch: refetchCurrentLPBalance } = useReadContract({ ... });


  const {
    amount: liquidityAmount,
    error: liquidityAmountError,
    setError: setLiquidityError,
    handleAmountChange: handleLiquidityAmountChange,
    validateAmount: validateLiquidityAmount,
    reset: resetLiquidityAmount,
    amountInWei: liquidityAmountInWei
  } = useAmountForm(liquidityTokenBalance, 2, liquidityTokenDecimals); // Assuming liquidity amount is based on the selected token

  const { data: liquidityTokenAllowance = 0n, refetch: refetchLiquidityTokenAllowance } = useReadContract({
    address: selectedLiquidityToken,
    abi: selectedLiquidityToken === USDC?.address ? USDC?.abi : AAA?.abi,
    functionName: 'allowance',
    args: [address, UniswapV2Router02?.address],
    enabled: Boolean(address && selectedLiquidityToken && UniswapV2Router02 && isConnected),
    watch: true,
  });

  const { data: usdcAllowance = 0n, refetch: refetchUSDCAllowance } = useReadContract({
    address: USDC?.address,
    abi: USDC?.abi,
    functionName: 'allowance',
    args: [address, UniswapV2Router02?.address],
    enabled: Boolean(address && USDC && UniswapV2Router02 && isConnected),
  });

  const { isProcessing: isApprovingLiquidity, error: approveLiquidityError, success: approveLiquiditySuccess, handleTransaction: handleApproveLiquidity } =
    useTransaction({
      onSuccess: async () => {
        await Promise.all([
          refetchLiquidityTokenAllowance(),
          refetchUSDCAllowance()
        ]);
      }
    });

  const { isProcessing: isAddingLiquidity, error: addLiquidityError, success: addLiquiditySuccess, handleTransaction: handleAddLiquidityTransaction } =
    useTransaction({
      onSuccess: () => {
        resetLiquidityAmount();
        // Refetch allowances
        refetchLiquidityTokenAllowance();
        refetchUSDCAllowance();
        // Refetch balances of tokens used
        // Assuming refetch functions are available from useReadContract hooks for balances
        // For example, if useUSDCBalance hook provides refetch:
        // refetchUsdcBalance();
        // And similarly for selectedLiquidityToken balance.
        // For now, we'll rely on watch:true or manual refresh if these specific refetches aren't set up.
        // If refetchCurrentLPBalance is set up (see above), call it here:
        // refetchCurrentLPBalance();
      }
    });

  const { writeContractAsync } = useWriteContract();

  const handleApproveLiquidityClick = () => {
    handleApproveLiquidity(async () => {
      try {
        const approveTokenHash = await writeContractAsync({
          address: selectedLiquidityToken,
          abi: selectedLiquidityToken === USDC?.address ? USDC?.abi : AAA?.abi,
          functionName: 'approve',
          args: [UniswapV2Router02.address, liquidityAmountInWei]
        });
        console.log('Approve token hash:', approveTokenHash);

        const tokenReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: approveTokenHash });
        if (tokenReceipt.status !== 'success') {
          throw new Error('Token approval transaction failed');
        }
        await refetchLiquidityTokenAllowance();

        const approveUSDCHash = await writeContractAsync({
          address: USDC.address,
          abi: USDC.abi,
          functionName: 'approve',
          args: [UniswapV2Router02.address, liquidityAmountInWei] // Assuming same amount for USDC
        });
        console.log('Approve USDC hash:', approveUSDCHash);

        const usdcReceipt = await waitForTransactionReceipt(wagmiConfig, { hash: approveUSDCHash });
        if (usdcReceipt.status !== 'success') {
          throw new Error('USDC approval transaction failed');
        }
        await refetchUSDCAllowance();

        return approveUSDCHash; // Return last hash for transaction tracking (useTransaction hook will track this one)
      } catch (err) {
        console.error('Approval error in AddLiquidityTab:', err);
        // Ensure the error is re-thrown so useTransaction hook can catch it
        if (err.shortMessage) throw new Error(err.shortMessage); // wagmi errors
        throw err; // other errors
      }
    });
  };

  const handleAddLiquidity = () => {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
    handleAddLiquidityTransaction(async () => {
      try {
        const hash = await writeContractAsync({
          address: UniswapV2Router02.address,
          abi: UniswapV2Router02.abi,
          functionName: 'addLiquidity',
          args: [
            selectedLiquidityToken,
            USDC.address,
            liquidityAmountInWei,
            liquidityAmountInWei, // Assuming 1:1 for simplicity, real scenario needs price ratio
            0, // Min amounts
            0,
            address,
            deadline
          ]
        });
        console.log('Add liquidity hash:', hash);
        return hash;
      } catch (err) {
        console.error('Add liquidity error:', err);
        throw err;
      }
    });
  };

  const trancheTokens = [
    { address: AAA?.address, symbol: 'AAA' },
    { address: AA?.address, symbol: 'AA' },
    // USDC is the pair token, not selectable here
  ].filter(token => token.address);

  return (
    <ContentCard title="Add Liquidity (Token/USDC)">
      <TransactionAlerts
        error={liquidityAmountError || approveLiquidityError || addLiquidityError}
        success={approveLiquiditySuccess || addLiquiditySuccess}
      />

      <Stack spacing={3}>
        <div>
          <TokenSelect
            token={selectedLiquidityToken}
            onTokenChange={setSelectedLiquidityToken}
            tokens={trancheTokens}
            label="Select Token"
          />
          <AmountField
            amount={liquidityAmount}
            setAmount={handleLiquidityAmountChange}
            validateAmount={validateLiquidityAmount}
            setError={setLiquidityError}
            // Max amount should consider both token and USDC balance if pairing
            maxAmount={Math.min(Number(formatUnits(liquidityTokenBalance, liquidityTokenDecimals)), Number(formatUnits(usdcBalance, 6)))}
            label="Amount of Token to Deposit"
          />
          <Typography variant="body2" sx={{ color: 'text.secondary', mt:1, mb: 2 }}>
            (An equivalent amount of USDC will be required)
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt:0, mb: 1 }}>
            Your Token Balance: {formatUnits(liquidityTokenBalance, liquidityTokenDecimals)} {trancheTokens.find(t => t.address === selectedLiquidityToken)?.symbol}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            Your Token Allowance: {formatUnits(liquidityTokenAllowance, liquidityTokenDecimals)} {trancheTokens.find(t => t.address === selectedLiquidityToken)?.symbol}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            Your USDC Balance: {formatUnits(usdcBalance, 6)} USDC
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Your USDC Allowance: {formatUnits(usdcAllowance, 6)} USDC
          </Typography>
        </div>

        <Stack direction="row" spacing={2}>
          <Button
            fullWidth
            variant={(liquidityAmountInWei > liquidityTokenAllowance || liquidityAmountInWei > usdcAllowance) && liquidityAmountInWei !== 0n && validateLiquidityAmount(liquidityAmount) ? "contained" : "outlined"}
            onClick={handleApproveLiquidityClick}
            disabled={
              !liquidityAmount ||
              liquidityAmountInWei === 0n ||
              !validateLiquidityAmount(liquidityAmount) ||
              !selectedLiquidityToken ||
              isApprovingLiquidity ||
              (liquidityAmountInWei <= liquidityTokenAllowance && liquidityAmountInWei <= usdcAllowance) // Disabled if both allowances are already sufficient
            }
            startIcon={isApprovingLiquidity ? <CircularProgress size={24} /> : <Pool />}
            color="primary"
          >
            1. Approve Tokens
          </Button>
          <Button
            fullWidth
            variant={(liquidityAmountInWei <= liquidityTokenAllowance && liquidityAmountInWei <= usdcAllowance) ? "contained" : "outlined"}
            onClick={handleAddLiquidity}
            disabled={
              !liquidityAmount ||
              liquidityAmountInWei === 0n ||
              !validateLiquidityAmount(liquidityAmount) ||
              !selectedLiquidityToken ||
              isAddingLiquidity ||
              (liquidityAmountInWei > liquidityTokenAllowance || liquidityAmountInWei > usdcAllowance) // Disabled if either allowance is insufficient
            }
            startIcon={isAddingLiquidity ? <CircularProgress size={24} /> : <Pool />}
            color="primary"
          >
            2. Add Liquidity
          </Button>
        </Stack>
      </Stack>
    </ContentCard>
  );
};

export default AddLiquidityTab;
