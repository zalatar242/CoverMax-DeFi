import React from 'react';
import { useWalletConnection } from './walletConnector';
import { useMainConfig, useTranchesConfig } from './contractConfig';
import { useReadContract } from 'wagmi';
import { formatUnits, numberToHex, hexToBigInt, type Address } from 'viem';

interface USDCBalanceHookReturn {
  balance: bigint;
  isError: boolean;
  isLoading: boolean;
  refetch: () => void;
}

export const useUSDCBalance = (): USDCBalanceHookReturn => {
  const { address, isConnected } = useWalletConnection();
  const { USDC } = useMainConfig();

  const { data, isError, isLoading, refetch } = useReadContract({
    address: USDC?.address as Address,
    abi: USDC?.abi,
    functionName: 'balanceOf',
    args: [address as Address],
  }) as { data: bigint | undefined; isError: boolean; isLoading: boolean; refetch: () => void };

  return {
    balance: data || 0n,
    isError,
    isLoading,
    refetch
  };
};

interface PortfolioDataReturn {
  trancheAAA: string;
  trancheAA: string;
  depositedValue: string;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export const usePortfolioData = (): PortfolioDataReturn => {
  const { address, isConnected } = useWalletConnection();
  const { Insurance } = useMainConfig();
  const tranches = useTranchesConfig();

  const {
    data: trancheAAAData,
    isLoading: loadingAAA,
    isError: errorAAA,
    refetch: refetchAAA
  } = useReadContract({
    address: tranches?.AAA?.address as Address,
    abi: tranches?.AAA?.abi,
    functionName: 'balanceOf',
    args: [address as Address],
  }) as { data: bigint | undefined; isLoading: boolean; isError: boolean; refetch: () => void };

  const {
    data: trancheAAData,
    isLoading: loadingAA,
    isError: errorAA,
    refetch: refetchAA
  } = useReadContract({
    address: tranches?.AA?.address as Address,
    abi: tranches?.AA?.abi,
    functionName: 'balanceOf',
    args: [address as Address],
  }) as { data: bigint | undefined; isLoading: boolean; isError: boolean; refetch: () => void };

  const {
    data: depositedValueData,
    isLoading: loadingDeposited,
    isError: errorDeposited,
    refetch: refetchDeposited
  } = useReadContract({
    address: Insurance?.address as Address,
    abi: Insurance?.abi,
    functionName: 'getUserDeposit',
    args: [address as Address],
  }) as { data: bigint | undefined; isLoading: boolean; isError: boolean; refetch: () => void };

  const refetchAll = () => {
    refetchAAA?.();
    refetchAA?.();
    refetchDeposited?.();
  };

  return {
    trancheAAA: trancheAAAData ? formatUnits(trancheAAAData, 6) : "0",
    trancheAA: trancheAAData ? formatUnits(trancheAAData, 6) : "0",
    depositedValue: depositedValueData ? formatUnits(depositedValueData, 6) : "0",
    isLoading: loadingAAA || loadingAA || loadingDeposited,
    isError: errorAAA || errorAA || errorDeposited,
    refetch: refetchAll
  };
};

interface ProtocolAPYReturn {
  aave: number;
  moonwell: number;
}

export const useProtocolAPY = (): ProtocolAPYReturn => {
  return {
    aave: 0.30, // 30% APY from MockAaveContracts
    moonwell: 0.30 // 30% APY from MockMoonwell
  };
};

interface EarnedInterestReturn {
  total: number;
  ratePerSecond: number;
  isEarning: boolean;
}

export const useEarnedInterest = (totalValue: string | number): EarnedInterestReturn => {
  const protocolAPY = useProtocolAPY();

  // Parse total value to ensure it's a number
  const parsedValue = parseFloat(String(totalValue)) || 0;

  // Calculate average APY across protocols
  const averageAPY = (protocolAPY.aave + protocolAPY.moonwell) / 2;

  // Calculate interest per second based on APY
  const interestPerSecond = averageAPY / (365 * 24 * 60 * 60);

  // Start earning as soon as funds are deposited
  const isEarningInterest = parsedValue > 0;

  // State for tracking earnings
  const [earnedInterest, setEarnedInterest] = React.useState<number>(0);
  const [instantRate, setInstantRate] = React.useState<number>(0);
  const lastUpdate = React.useRef<number>(Date.now());

  React.useEffect(() => {
    if (!isEarningInterest) {
      setInstantRate(0);
      return;
    }

    const calculateInterest = () => {
      const now = Date.now();
      const timeDiff = (now - lastUpdate.current) / 1000;

      // Calculate continuous interest
      const interest = parsedValue * interestPerSecond * timeDiff;
      const rate = parsedValue * interestPerSecond;

      setInstantRate(rate);
      setEarnedInterest(prev => prev + interest);
      lastUpdate.current = now;
    };

    calculateInterest();
    const interval = setInterval(calculateInterest, 100);
    return () => clearInterval(interval);
  }, [parsedValue, interestPerSecond, isEarningInterest]);

  return {
    total: earnedInterest,
    ratePerSecond: instantRate,
    isEarning: isEarningInterest
  };
};

interface Phase {
  name: string;
  start: Date;
  end: Date;
}

interface Phases {
  deposit: Phase;
  insurance: Phase;
  withdrawal: Phase;
}

interface TVLData {
  total: string;
  byTranche: {
    AAA: string;
    AA: string;
  };
}

interface ProtocolStatusReturn {
  status: string;
  phases: Phases;
  tvl: TVLData;
  isLoading: boolean;
  isError: boolean;
}

export const useProtocolStatus = (): ProtocolStatusReturn => {
  const { Insurance } = useMainConfig();
  const tranches = useTranchesConfig();

  // Get time periods
  const { data: startTime = 0n, isLoading: loadingS } = useReadContract({
    address: Insurance?.address as Address,
    abi: Insurance?.abi,
    functionName: 'S',
  });

  const { data: t1Time = 0n, isLoading: loadingT1 } = useReadContract({
    address: Insurance?.address as Address,
    abi: Insurance?.abi,
    functionName: 'T1',
  });

  const { data: t2Time = 0n, isLoading: loadingT2 } = useReadContract({
    address: Insurance?.address as Address,
    abi: Insurance?.abi,
    functionName: 'T2',
  });

  // Get total supply for each tranche
  const { data: trancheAAASupply = 0n, isLoading: loadingSupplyAAA } = useReadContract({
    address: tranches?.AAA?.address as Address,
    abi: tranches?.AAA?.abi,
    functionName: 'totalSupply',
  });

  const { data: trancheAASupply = 0n, isLoading: loadingSupplyAA } = useReadContract({
    address: tranches?.AA?.address as Address,
    abi: tranches?.AA?.abi,
    functionName: 'totalSupply',
  });

  // Calculate total TVL
  const totalTVL = (trancheAAASupply || 0n) + (trancheAASupply || 0n);

  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

  // Calculate phase durations according to contract
  // S = block.timestamp + 2 days
  // T1 = S + 5 days
  // T2 = T1 + 1 days
  // T3 = T2 + 1 days
  const phases: Phases = {
    deposit: {
      name: "Deposit Phase (2 days)",
      start: new Date(Number((startTime || 0n) - 2n * 24n * 60n * 60n) * 1000),
      end: new Date(Number(startTime || 0n) * 1000)
    },
    insurance: {
      name: "Insurance Phase (5 days)",
      start: new Date(Number(startTime || 0n) * 1000),
      end: new Date(Number(t1Time || 0n) * 1000)
    },
    withdrawal: {
      name: "Withdrawal Phase (3 days)",
      start: new Date(Number(t1Time || 0n) * 1000),
      end: new Date(Number((t2Time || 0n) + 2n * 24n * 60n * 60n) * 1000)
    }
  };

  // Calculate current phase
  let status: string;
  if (currentTimestamp < (startTime || 0n)) {
    status = phases.deposit.name;
  } else if (currentTimestamp < (t1Time || 0n)) {
    status = phases.insurance.name;
  } else {
    status = phases.withdrawal.name;
  }

  const isLoading = loadingS || loadingT1 || loadingT2 ||
                    loadingSupplyAAA || loadingSupplyAA;

  return {
    status,
    phases,
    tvl: {
      total: formatUnits(totalTVL, 6),
      byTranche: {
        AAA: formatUnits(trancheAAASupply || 0n, 6),
        AA: formatUnits(trancheAASupply || 0n, 6)
      }
    },
    isLoading,
    isError: false
  };
};
