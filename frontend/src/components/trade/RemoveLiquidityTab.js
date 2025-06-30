import React, { useState, useMemo } from 'react';
import { Button, Stack, CircularProgress, Typography } from '@mui/material';
import { Remove } from '@mui/icons-material';
import { useWalletConnection } from '../../utils/walletConnector';
import { useMainConfig, useTranchesConfig, useContractsConfig } from '../../utils/contractConfig';
import { useWriteContract, useReadContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { useTransaction } from '../../utils/useTransaction';
import { useAmountForm } from '../../utils/useAmountForm';
import {
  ContentCard,
  AmountField,
  TransactionAlerts,
  TokenSelect
} from '../ui';

const RemoveLiquidityTab = ({ onTransactionSuccess }) => {
  const { isConnected, address } = useWalletConnection();
  const { USDC, UniswapV2Router02 } = useMainConfig();
  const { AAA, AA } = useTranchesConfig();
  const contracts = useContractsConfig();
  const UniswapV2Factory = contracts?.UniswapV2Factory;

  const [removeLiquidityToken, setRemoveLiquidityToken] = useState('');

  // Get pair address for remove liquidity
  const { data: removeLiquidityPairAddress } = useReadContract({
    address: UniswapV2Factory?.address?.toLowerCase(),
    abi: UniswapV2Factory?.abi,
    functionName: 'getPair',
    args: [removeLiquidityToken?.toLowerCase(), USDC?.address?.toLowerCase()],
    enabled: Boolean(removeLiquidityToken && USDC?.address && UniswapV2Factory?.address && UniswapV2Factory?.abi),
    watch: true,
  });

  // Get LP token balance for the selected pair (actual 18 decimal balance)
  const { data: removeLiquidityLPBalance = 0n, refetch: refetchRemoveLiquidityLPBalance } = useReadContract({
    address: removeLiquidityPairAddress?.toLowerCase(),
    abi: [{ type: 'function', name: 'balanceOf', constant: true, stateMutability: 'view', inputs: [{ type: 'address', name: 'account' }], outputs: [{ type: 'uint256', name: '' }] }],
    functionName: 'balanceOf',
    args: [address?.toLowerCase()],
    enabled: Boolean(removeLiquidityPairAddress && removeLiquidityPairAddress !== '0x0000000000000000000000000000000000000000' && address),
    watch: true,
  });

  // For UI display and input, we format LP balance to 6 decimals.
  // The useAmountForm will also operate on this 6-decimal formatted value.
  const formattedLPBalanceForUI = useMemo(() => {
    return formatUnits(removeLiquidityLPBalance, 6); // LP tokens have 18 decimals, format to string
  }, [removeLiquidityLPBalance]);


  const {
    amount: removeLiquidityAmount, // This will be the 6-decimal string from AmountField
    error: removeLiquidityError,
    setError: setRemoveLiquidityError,
    handleAmountChange: handleRemoveLiquidityAmountChange,
    validateAmount: validateRemoveLiquidityAmount,
    reset: resetRemoveLiquidityAmount,
    // amountInWei is not directly used here as we need to calculate actual LP amount based on ratio
  } = useAmountForm(parseUnits(formattedLPBalanceForUI, 6), 1, 6); // Initialize with 6-decimal formatted balance


  // Get LP token allowance for remove liquidity (actual 18 decimal allowance)
  const { data: removeLiquidityLPAllowance = 0n, refetch: refetchRemoveLiquidityLPAllowance } = useReadContract({
    address: removeLiquidityPairAddress?.toLowerCase(),
    abi: [{ type: 'function', name: 'allowance', constant: true, stateMutability: 'view', inputs: [{ type: 'address', name: 'owner' }, { type: 'address', name: 'spender' }], outputs: [{ type: 'uint256', name: '' }] }],
    functionName: 'allowance',
    args: [address?.toLowerCase(), UniswapV2Router02?.address?.toLowerCase()],
    enabled: Boolean(removeLiquidityPairAddress && removeLiquidityPairAddress !== '0x0000000000000000000000000000000000000000' && address && UniswapV2Router02?.address && isConnected),
    watch: true,
  });

  const { isProcessing: isApprovingRemoveLiquidity, error: approveRemoveLiquidityError, success: approveRemoveLiquiditySuccess, handleTransaction: handleApproveRemoveLiquidity } =
    useTransaction({
      onSuccess: () => {
        refetchRemoveLiquidityLPAllowance();
      }
    });

  const { isProcessing: isRemovingLiquidity, error: removeLiquidityTransactionError, success: removeLiquiditySuccess, handleTransaction: handleRemoveLiquidityTransaction } =
    useTransaction({
      onSuccess: () => {
        resetRemoveLiquidityAmount();
        refetchRemoveLiquidityLPAllowance();
        refetchRemoveLiquidityLPBalance();
        // Balances of underlying tokens will be refetched by the parent component
        // due to refreshKey change
        if (onTransactionSuccess) {
          onTransactionSuccess();
        }
      }
    });

  const { writeContractAsync } = useWriteContract();

  const calculateActualLPAmount = (uiAmountString) => {
    if (!removeLiquidityLPBalance || removeLiquidityLPBalance === 0n || !uiAmountString) return 0n;
    const userInputAmount = Number(uiAmountString); // User input (assumed to be 6 dec representation)

    // To correctly scale, consider user input as a portion of the UI-formatted max balance
    const maxUIDisplayAmount = Number(formatUnits(removeLiquidityLPBalance, 6));
    if (maxUIDisplayAmount === 0) return 0n;

    const ratio = userInputAmount / maxUIDisplayAmount;
    const actualAmount = BigInt(Math.floor(Number(removeLiquidityLPBalance) * ratio)); // eslint-disable-line no-undef -- BigInt is a standard global
    return actualAmount;
  };

  const actualLPAmountToProcess = calculateActualLPAmount(removeLiquidityAmount);

  const handleApproveRemoveLiquidityClick = () => {
    handleApproveRemoveLiquidity(async () => {
      try {
        console.log('Approving LP tokens:', {
          uiAmount: removeLiquidityAmount,
          actualLPAmountToApprove: actualLPAmountToProcess.toString(),
          pairAddress: removeLiquidityPairAddress,
          routerAddress: UniswapV2Router02?.address
        });

        const hash = await writeContractAsync({
          address: removeLiquidityPairAddress?.toLowerCase(),
          abi: [{ type: 'function', name: 'approve', constant: false, inputs: [{ type: 'address', name: 'spender' }, { type: 'uint256', name: 'amount' }], outputs: [{ type: 'bool', name: '' }] }],
          functionName: 'approve',
          args: [UniswapV2Router02?.address?.toLowerCase(), actualLPAmountToProcess]
        });
        console.log('LP token approval hash:', hash);
        return hash;
      } catch (err) {
        console.error('LP token approval error:', err);
        throw err;
      }
    });
  };

  const handleRemoveLiquidity = () => {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
    handleRemoveLiquidityTransaction(async () => {
      try {
        console.log('Removing liquidity:', {
          uiAmount: removeLiquidityAmount,
          actualLPAmountToRemove: actualLPAmountToProcess.toString(),
          token: removeLiquidityToken,
          usdc: USDC.address,
          pairAddress: removeLiquidityPairAddress
        });

        const hash = await writeContractAsync({
          address: UniswapV2Router02.address?.toLowerCase(),
          abi: UniswapV2Router02.abi,
          functionName: 'removeLiquidity',
          args: [
            removeLiquidityToken?.toLowerCase(),
            USDC.address?.toLowerCase(),
            actualLPAmountToProcess,
            0, // Min amounts
            0,
            address?.toLowerCase(),
            deadline
          ]
        });
        console.log('Remove liquidity hash:', hash);
        return hash;
      } catch (err) {
        console.error('Remove liquidity error:', err);
        throw err;
      }
    });
  };

  const trancheTokens = [
    { address: AAA?.address, symbol: 'AAA' },
    { address: AA?.address, symbol: 'AA' },
  ].filter(token => token.address);

  // Simplified button logic constants
  const needsApproval = actualLPAmountToProcess > removeLiquidityLPAllowance;
  const canProceed = actualLPAmountToProcess <= removeLiquidityLPAllowance;
  const isValidAmountEntered = removeLiquidityAmount && actualLPAmountToProcess !== 0n && validateRemoveLiquidityAmount(removeLiquidityAmount);

  const approveButtonDisabled = !isValidAmountEntered ||
                                !removeLiquidityToken ||
                                isApprovingRemoveLiquidity ||
                                !needsApproval; // Disabled if approval not needed

  const removeButtonDisabled = !isValidAmountEntered ||
                               !removeLiquidityToken ||
                               isRemovingLiquidity ||
                               needsApproval; // Disabled if approval is needed


  return (
    <ContentCard title="Remove Liquidity (Token/USDC)">
      <TransactionAlerts
        error={removeLiquidityError || removeLiquidityTransactionError || approveRemoveLiquidityError}
        success={removeLiquiditySuccess || approveRemoveLiquiditySuccess}
      />
      <Stack spacing={3}>
        <div>
          <TokenSelect
            token={removeLiquidityToken}
            onTokenChange={setRemoveLiquidityToken}
            tokens={trancheTokens}
            label="Select Token from Pool"
          />
          <AmountField
            amount={removeLiquidityAmount} // UI amount (6-decimal formatted)
            setAmount={handleRemoveLiquidityAmountChange}
            validateAmount={validateRemoveLiquidityAmount}
            setError={setRemoveLiquidityError}
            maxAmount={Number(formattedLPBalanceForUI)} // Max is the UI formatted balance
            label="Amount of LP Tokens to Remove"
          />
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, mb: 1 }}>
            Your LP Token Balance: {Number(formattedLPBalanceForUI).toLocaleString(undefined, { maximumFractionDigits: 6 })}
            {' '}({trancheTokens.find(t => t.address === removeLiquidityToken)?.symbol || ''}/USDC LP)
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Your LP Token Allowance: {Number(formatUnits(removeLiquidityLPAllowance, 18)).toLocaleString(undefined, { maximumFractionDigits: 6 })}
          </Typography>
        </div>

        <Stack direction="row" spacing={2}>
          <Button
            fullWidth
            variant={needsApproval && isValidAmountEntered ? "contained" : "outlined"}
            onClick={handleApproveRemoveLiquidityClick}
            disabled={approveButtonDisabled}
            startIcon={isApprovingRemoveLiquidity ? <CircularProgress size={24} /> : <Remove />}
            color="primary"
          >
            1. Approve LP Tokens
          </Button>
          <Button
            fullWidth
            variant={canProceed ? "contained" : "outlined"}
            onClick={handleRemoveLiquidity}
            disabled={removeButtonDisabled}
            startIcon={isRemovingLiquidity ? <CircularProgress size={24} /> : <Remove />}
            color="primary"
          >
            2. Remove Liquidity
          </Button>
        </Stack>
      </Stack>
    </ContentCard>
  );
};

export default RemoveLiquidityTab;
