import { useWalletConnection } from './walletConnector';
import { useMainConfig, useTranchesConfig } from './contractConfig';
import { useReadContract } from 'wagmi';
import { formatUnits, parseEther } from 'viem';

// Demo mode flag - set to false for live data
const DEMO_MODE = false;

export const useUSDCBalance = () => {
  const { address, isConnected } = useWalletConnection();
  const { USDC } = useMainConfig();

  const { data, isError, isLoading } = useReadContract({
    address: USDC?.address,
    abi: USDC?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && USDC && isConnected),
  });

  return {
    balance: data || 0n,
    isError,
    isLoading
  };
};

export const usePortfolioData = () => {
  const { address, isConnected } = useWalletConnection();
  const { Insurance } = useMainConfig();
  const tranches = useTranchesConfig();

  const { data: trancheAData, isLoading: loadingA, isError: errorA } = useReadContract({
    address: tranches?.A?.address,
    abi: tranches?.A?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && tranches?.A && isConnected),
  });

  const { data: trancheBData, isLoading: loadingB, isError: errorB } = useReadContract({
    address: tranches?.B?.address,
    abi: tranches?.B?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && tranches?.B && isConnected),
  });

  const { data: trancheCData, isLoading: loadingC, isError: errorC } = useReadContract({
    address: tranches?.C?.address,
    abi: tranches?.C?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && tranches?.C && isConnected),
  });

  const { data: depositedValueData, isLoading: loadingDeposited, isError: errorDeposited } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'getUserDeposit',
    args: [address],
    enabled: Boolean(address && Insurance && isConnected),
  });

  return {
    trancheA: trancheAData ? formatUnits(trancheAData, 6) : "0",
    trancheB: trancheBData ? formatUnits(trancheBData, 6) : "0",
    trancheC: trancheCData ? formatUnits(trancheCData, 6) : "0",
    depositedValue: depositedValueData ? formatUnits(depositedValueData, 6) : "0",
    isLoading: loadingA || loadingB || loadingC || loadingDeposited,
    isError: errorA || errorB || errorC || errorDeposited
  };
};

export const useProtocolStatus = () => {
  const { Insurance } = useMainConfig();
  const tranches = useTranchesConfig();

  const { data: isInvestedData = false, isLoading: loadingInvested } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'isInvested',
    enabled: Boolean(Insurance),
  });

  const { data: inLiquidModeData = false, isLoading: loadingLiquid } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'inLiquidMode',
    enabled: Boolean(Insurance),
  });

  // Fetch TVL for each tranche
  const { data: trancheATVL = 0n, isLoading: loadingTVLA } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'getTrancheValue',
    args: [0], // Tranche A index
    enabled: Boolean(Insurance),
  });

  const { data: trancheBTVL = 0n, isLoading: loadingTVLB } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'getTrancheValue',
    args: [1], // Tranche B index
    enabled: Boolean(Insurance),
  });

  const { data: trancheCTVL = 0n, isLoading: loadingTVLC } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'getTrancheValue',
    args: [2], // Tranche C index
    enabled: Boolean(Insurance),
  });

  // Calculate APY from yield rate
  const { data: trancheAYield = 0n, isLoading: loadingYieldA } = useReadContract({
    address: tranches?.A?.address,
    abi: tranches?.A?.abi,
    functionName: 'getCurrentYieldRate',
    enabled: Boolean(tranches?.A),
  });

  const { data: trancheBYield = 0n, isLoading: loadingYieldB } = useReadContract({
    address: tranches?.B?.address,
    abi: tranches?.B?.abi,
    functionName: 'getCurrentYieldRate',
    enabled: Boolean(tranches?.B),
  });

  const { data: trancheCYield = 0n, isLoading: loadingYieldC } = useReadContract({
    address: tranches?.C?.address,
    abi: tranches?.C?.abi,
    functionName: 'getCurrentYieldRate',
    enabled: Boolean(tranches?.C),
  });

  let status;
  if (!isInvestedData) {
    status = "Deposit Period";
  } else if (!inLiquidModeData) {
    status = "Investment Period";
  } else {
    status = "Claim Period";
  }

  const totalTVL = trancheATVL + trancheBTVL + trancheCTVL;

  const isLoading =
    loadingInvested || loadingLiquid ||
    loadingTVLA || loadingTVLB || loadingTVLC ||
    loadingYieldA || loadingYieldB || loadingYieldC;

  return {
    status,
    tvl: {
      total: formatUnits(totalTVL, 6),
      byTranche: {
        A: formatUnits(trancheATVL, 6),
        B: formatUnits(trancheBTVL, 6),
        C: formatUnits(trancheCTVL, 6)
      }
    },
    apy: {
      A: formatUnits(trancheAYield, 6),
      B: formatUnits(trancheBYield, 6),
      C: formatUnits(trancheCYield, 6)
    },
    isLoading,
    isError: false
  };
};
