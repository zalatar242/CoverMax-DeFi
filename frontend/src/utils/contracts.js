import { useWalletConnection } from './walletConnector';
import { useMainConfig, useTranchesConfig } from './contractConfig';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';

export const useUSDCBalance = () => {
  const { address } = useWalletConnection();
  const { USDC } = useMainConfig();

  const { data, error, isError, isLoading } = useReadContract({
    address: USDC?.address,
    abi: USDC?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && USDC),
  });

  return {
    balance: data ? formatUnits(data, 6) : "0",
    isError,
    isLoading
  };
};

export const usePortfolioData = () => {
  const { address } = useWalletConnection();
  const { Insurance } = useMainConfig();
  const tranches = useTranchesConfig();

  const { data: trancheAData, isLoading: loadingA, isError: errorA } = useReadContract({
    address: tranches?.A?.address,
    abi: tranches?.A?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && tranches?.A),
  });

  const { data: trancheBData, isLoading: loadingB, isError: errorB } = useReadContract({
    address: tranches?.B?.address,
    abi: tranches?.B?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && tranches?.B),
  });

  const { data: trancheCData, isLoading: loadingC, isError: errorC } = useReadContract({
    address: tranches?.C?.address,
    abi: tranches?.C?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && tranches?.C),
  });

  const { data: depositedValueData, isLoading: loadingDeposited, isError: errorDeposited } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'getUserDepositedValue',
    args: [address],
    enabled: Boolean(address && Insurance),
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

  const { data: totalAData, isLoading: loadingTotalA, isError: errorTotalA } = useReadContract({
    address: tranches?.A?.address,
    abi: tranches?.A?.abi,
    functionName: 'totalSupply',
    enabled: Boolean(tranches?.A),
  });

  const { data: totalBData, isLoading: loadingTotalB, isError: errorTotalB } = useReadContract({
    address: tranches?.B?.address,
    abi: tranches?.B?.abi,
    functionName: 'totalSupply',
    enabled: Boolean(tranches?.B),
  });

  const { data: totalCData, isLoading: loadingTotalC, isError: errorTotalC } = useReadContract({
    address: tranches?.C?.address,
    abi: tranches?.C?.abi,
    functionName: 'totalSupply',
    enabled: Boolean(tranches?.C),
  });

  const { data: rateAData, isLoading: loadingRateA, isError: errorRateA } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'T1',
    enabled: Boolean(Insurance),
  });

  const { data: rateBData, isLoading: loadingRateB, isError: errorRateB } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'T2',
    enabled: Boolean(Insurance),
  });

  const { data: rateCData, isLoading: loadingRateC, isError: errorRateC } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'T3',
    enabled: Boolean(Insurance),
  });

  let status;
  if (!isInvestedData) {
    status = "Deposit Period";
  } else if (!inLiquidModeData) {
    status = "Investment Period";
  } else {
    status = "Claim Period";
  }

  // Calculate APYs with null checks
  const apy = {
    A: rateAData ? formatUnits(rateAData, 6) : "0",
    B: rateBData ? formatUnits(rateBData, 6) : "0",
    C: rateCData ? formatUnits(rateCData, 6) : "0"
  };

  // Calculate TVL with null checks
  const tvlByTranche = {
    A: totalAData ? formatUnits(totalAData, 6) : "0",
    B: totalBData ? formatUnits(totalBData, 6) : "0",
    C: totalCData ? formatUnits(totalCData, 6) : "0"
  };

  const totalTVL = (
    parseFloat(tvlByTranche.A) +
    parseFloat(tvlByTranche.B) +
    parseFloat(tvlByTranche.C)
  ).toFixed(2);

  return {
    status,
    tvl: {
      total: totalTVL,
      byTranche: tvlByTranche
    },
    apy,
    isLoading: loadingTotalA || loadingTotalB || loadingTotalC ||
               loadingRateA || loadingRateB || loadingRateC ||
               loadingInvested || loadingLiquid,
    isError: errorTotalA || errorTotalB || errorTotalC ||
             errorRateA || errorRateB || errorRateC
  };
};
