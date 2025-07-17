import React from 'react';
import { useWalletConnection } from './walletConnector';
import { useMainConfig, useTranchesConfig } from './contractConfig';
import { useReadContract } from 'wagmi';
import { formatUnits, numberToHex, hexToBigInt } from 'viem';
import { useMultipleTokenData } from '../hooks/useTokenData';

interface TokenData {
  balance: bigint;
  decimals: number;
  refetchBalance?: () => void;
}

interface PortfolioData {
  trancheAAA: string;
  trancheAA: string;
  depositedValue: string;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

interface ProtocolAPY {
  aave: number;
  moonwell: number;
}

interface EarnedInterest {
  total: number;
  ratePerSecond: number;
  isEarning: boolean;
}

interface PhaseInfo {
  name: string;
  start: Date;
  end: Date;
}

interface ProtocolStatus {
  status: string;
  phases: {
    deposit: PhaseInfo;
    insurance: PhaseInfo;
    withdrawal: PhaseInfo;
  };
  tvl: {
    total: string;
    byTranche: {
      AAA: string;
      AA: string;
    };
  };
  isLoading: boolean;
  isError: boolean;
}

export const useUSDCBalance = () => {
  const { address, isConnected } = useWalletConnection();
  const { USDC } = useMainConfig();

  const { data, isError, isLoading, refetch } = useReadContract({
    address: USDC?.address as `0x${string}`,
    abi: USDC?.abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: Boolean(address && USDC && isConnected),
    },
  });

  return {
    balance: data || 0n,
    isError,
    isLoading,
    refetch
  };
};

export const usePortfolioData = (): PortfolioData => {
  const { address, isConnected } = useWalletConnection();
  const { Insurance } = useMainConfig();
  const tranches = useTranchesConfig();

  // Use consolidated token data for tranches
  const trancheTokens = [
    { address: tranches?.AAA?.address, abi: tranches?.AAA?.abi },
    { address: tranches?.AA?.address, abi: tranches?.AA?.abi },
  ].filter(token => token.address);

  console.log('Tranche tokens configuration:', trancheTokens);
  console.log('User address for portfolio:', address);

  const tokenData = useMultipleTokenData(trancheTokens, undefined, address);

  const {
    data: depositedValueData,
    isLoading: loadingDeposited,
    isError: errorDeposited,
    refetch: refetchDeposited
  } = useReadContract({
    address: Insurance?.address as `0x${string}`,
    abi: Insurance?.abi,
    functionName: 'getUserDeposit',
    args: [address as `0x${string}`],
    query: {
      enabled: Boolean(address && Insurance && isConnected),
    },
  });

  const refetchAll = () => {
    console.log('Refetching portfolio data...');
    // Refetch token balances
    Object.values(tokenData).forEach(data => {
      if (data?.refetchBalance) {
        data.refetchBalance();
      }
    });
    refetchDeposited?.();
  };

  const aaaData = tokenData[tranches?.AAA?.address?.toLowerCase()];
  const aaData = tokenData[tranches?.AA?.address?.toLowerCase()];

  // Enhanced debug logging
  React.useEffect(() => {
    if (tranches?.AAA?.address && tranches?.AA?.address) {
      console.log('=== PORTFOLIO DATA DEBUG ===');
      console.log('Tranche addresses:', {
        AAA: tranches.AAA.address,
        AA: tranches.AA.address,
        AAALower: tranches.AAA.address.toLowerCase(),
        AALower: tranches.AA.address.toLowerCase()
      });
      console.log('Token data keys:', Object.keys(tokenData));
      console.log('AAA balance data:', aaaData);
      console.log('AA balance data:', aaData);
      console.log('User address:', address);
      console.log('Is connected:', isConnected);

      // Check if token data exists and has valid balances
      if (aaaData) {
        console.log('AAA Token - Balance:', aaaData.balance?.toString(), 'Decimals:', aaaData.decimals);
        console.log('AAA Token - isLoading:', aaaData.isLoading);
      } else {
        console.log('AAA Token data not found');
      }

      if (aaData) {
        console.log('AA Token - Balance:', aaData.balance?.toString(), 'Decimals:', aaData.decimals);
        console.log('AA Token - isLoading:', aaData.isLoading);
      } else {
        console.log('AA Token data not found');
      }
      console.log('=== END DEBUG ===');
    }
  }, [tranches, tokenData, aaaData, aaData, address, isConnected]);

  const result = {
    // Tranche tokens now use 18 decimals (updated for consistency)
    trancheAAA: aaaData ? formatUnits(aaaData.balance as bigint, 18) : "0",
    trancheAA: aaData ? formatUnits(aaData.balance as bigint, 18) : "0",
    depositedValue: depositedValueData ? formatUnits(depositedValueData as bigint, 18) : "0",
    isLoading: loadingDeposited,
    isError: errorDeposited,
    refetch: refetchAll
  };

  // Debug logging for return values
  console.log('Portfolio data result:', result);

  return result;
};

export const useProtocolAPY = (): ProtocolAPY => {
  return {
    aave: 0.30, // 30% APY from MockAaveContracts
    moonwell: 0.30 // 30% APY from MockMoonwell
  };
};

export const useEarnedInterest = (totalValue: string | number): EarnedInterest => {
  const protocolAPY = useProtocolAPY();

  // Parse total value to ensure it's a number
  const parsedValue = parseFloat(totalValue as string) || 0;

  // Calculate average APY across protocols
  const averageAPY = (protocolAPY.aave + protocolAPY.moonwell) / 2;

  // Calculate interest per second based on APY
  const interestPerSecond = averageAPY / (365 * 24 * 60 * 60);

  // Start earning as soon as funds are deposited
  const isEarningInterest = parsedValue > 0;

  // State for tracking earnings
  const [earnedInterest, setEarnedInterest] = React.useState(0);
  const [instantRate, setInstantRate] = React.useState(0);
  const lastUpdate = React.useRef(Date.now());

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

export const useProtocolStatus = (): ProtocolStatus => {
  const { Insurance } = useMainConfig();
  const tranches = useTranchesConfig();

  // Get time periods
  const { data: startTime = 0n, isLoading: loadingS } = useReadContract({
    address: Insurance?.address as `0x${string}`,
    abi: Insurance?.abi,
    functionName: 'S',
    query: {
      enabled: Boolean(Insurance),
    },
  });

  const { data: t1Time = 0n, isLoading: loadingT1 } = useReadContract({
    address: Insurance?.address as `0x${string}`,
    abi: Insurance?.abi,
    functionName: 'T1',
    query: {
      enabled: Boolean(Insurance),
    },
  });

  const { data: t2Time = 0n, isLoading: loadingT2 } = useReadContract({
    address: Insurance?.address as `0x${string}`,
    abi: Insurance?.abi,
    functionName: 'T2',
    query: {
      enabled: Boolean(Insurance),
    },
  });

  // Get total supply for each tranche
  const { data: trancheAAASupply = 0n, isLoading: loadingSupplyAAA } = useReadContract({
    address: tranches?.AAA?.address as `0x${string}`,
    abi: tranches?.AAA?.abi,
    functionName: 'totalSupply',
    query: {
      enabled: Boolean(tranches?.AAA),
    },
  });

  const { data: trancheAASupply = 0n, isLoading: loadingSupplyAA } = useReadContract({
    address: tranches?.AA?.address as `0x${string}`,
    abi: tranches?.AA?.abi,
    functionName: 'totalSupply',
    query: {
      enabled: Boolean(tranches?.AA),
    },
  });

  // Calculate total TVL
  const totalTVL = (trancheAAASupply as bigint) + (trancheAASupply as bigint);

  const currentTimestamp = hexToBigInt(numberToHex(Math.floor(Date.now() / 1000)));

  // Calculate phase durations according to contract
  // S = block.timestamp + 2 days
  // T1 = S + 5 days
  // T2 = T1 + 1 days
  // T3 = T2 + 1 days

  // Check if contract times are valid (not zero or very small)
  // Consider contract uninitialized if startTime is 0 or before year 2020
  const minimumValidTime = BigInt(1577836800); // Jan 1, 2020 timestamp
  const isContractInitialized = (startTime as bigint) > minimumValidTime &&
                                (t1Time as bigint) > minimumValidTime &&
                                (t2Time as bigint) > minimumValidTime;

  // Use current time as fallback if contract not initialized
  const now = Math.floor(Date.now() / 1000);
  const fallbackStartTime = BigInt(now + 2 * 24 * 60 * 60); // 2 days from now
  const fallbackT1Time = BigInt(now + 7 * 24 * 60 * 60);    // 7 days from now
  const fallbackT2Time = BigInt(now + 8 * 24 * 60 * 60);    // 8 days from now

  const effectiveStartTime = isContractInitialized ? (startTime as bigint) : fallbackStartTime;
  const effectiveT1Time = isContractInitialized ? (t1Time as bigint) : fallbackT1Time;
  const effectiveT2Time = isContractInitialized ? (t2Time as bigint) : fallbackT2Time;

  const phases = {
    deposit: {
      name: "Deposit Phase (2 days)",
      start: new Date(Number(effectiveStartTime - 2n * 24n * 60n * 60n) * 1000),
      end: new Date(Number(effectiveStartTime) * 1000)
    },
    insurance: {
      name: "Insurance Phase (5 days)",
      start: new Date(Number(effectiveStartTime) * 1000),
      end: new Date(Number(effectiveT1Time) * 1000)
    },
    withdrawal: {
      name: "Withdrawal Phase (3 days)",
      start: new Date(Number(effectiveT1Time) * 1000),
      end: new Date(Number(effectiveT2Time + 1n * 24n * 60n * 60n) * 1000)
    }
  };

  // Calculate current phase
  let status;
  if (currentTimestamp < effectiveStartTime) {
    status = phases.deposit.name;
  } else if (currentTimestamp < effectiveT1Time) {
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
      total: formatUnits(totalTVL as bigint, 18),
      byTranche: {
        AAA: formatUnits(trancheAAASupply as bigint, 18),
        AA: formatUnits(trancheAASupply as bigint, 18)
      }
    },
    isLoading,
    isError: false
  };
};
