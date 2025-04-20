import React from 'react';
import { useWalletConnection } from './walletConnector';
import { useMainConfig, useTranchesConfig } from './contractConfig';
import { useReadContract } from 'wagmi';
import { formatUnits, numberToHex, hexToBigInt } from 'viem';

export const useUSDCBalance = () => {
  const { address, isConnected } = useWalletConnection();
  const { USDC } = useMainConfig();

  const { data, isError, isLoading, refetch } = useReadContract({
    address: USDC?.address,
    abi: USDC?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && USDC && isConnected),
  });

  return {
    balance: data || 0n,
    isError,
    isLoading,
    refetch
  };
};

export const usePortfolioData = () => {
  const { address, isConnected } = useWalletConnection();
  const { Insurance } = useMainConfig();
  const tranches = useTranchesConfig();

  const {
    data: trancheAAAData,
    isLoading: loadingAAA,
    isError: errorAAA,
    refetch: refetchAAA
  } = useReadContract({
    address: tranches?.AAA?.address,
    abi: tranches?.AAA?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && tranches?.AAA && isConnected),
  });

  const {
    data: trancheAAData,
    isLoading: loadingAA,
    isError: errorAA,
    refetch: refetchAA
  } = useReadContract({
    address: tranches?.AA?.address,
    abi: tranches?.AA?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && tranches?.AA && isConnected),
  });

  const {
    data: depositedValueData,
    isLoading: loadingDeposited,
    isError: errorDeposited,
    refetch: refetchDeposited
  } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'getUserDeposit',
    args: [address],
    enabled: Boolean(address && Insurance && isConnected),
  });

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

export const useProtocolAPY = () => {
  return {
    aave: 0.30, // 30% APY from MockAaveContracts
    moonwell: 0.30 // 30% APY from MockMoonwell
  };
};

export const useEarnedInterest = (totalValue) => {
  const protocolAPY = useProtocolAPY();

  // Parse total value to ensure it's a number
  const parsedValue = parseFloat(totalValue) || 0;

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

export const useProtocolStatus = () => {
  const { Insurance } = useMainConfig();
  const tranches = useTranchesConfig();

  // Get time periods
  const { data: startTime = 0n, isLoading: loadingS } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'S',
    enabled: Boolean(Insurance),
  });

  const { data: t1Time = 0n, isLoading: loadingT1 } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'T1',
    enabled: Boolean(Insurance),
  });

  const { data: t2Time = 0n, isLoading: loadingT2 } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'T2',
    enabled: Boolean(Insurance),
  });

  // Get total supply for each tranche
  const { data: trancheAAASupply = 0n, isLoading: loadingSupplyAAA } = useReadContract({
    address: tranches?.AAA?.address,
    abi: tranches?.AAA?.abi,
    functionName: 'totalSupply',
    enabled: Boolean(tranches?.AAA),
  });

  const { data: trancheAASupply = 0n, isLoading: loadingSupplyAA } = useReadContract({
    address: tranches?.AA?.address,
    abi: tranches?.AA?.abi,
    functionName: 'totalSupply',
    enabled: Boolean(tranches?.AA),
  });

  // Calculate total TVL
  const totalTVL = trancheAAASupply + trancheAASupply;

  const currentTimestamp = hexToBigInt(numberToHex(Math.floor(Date.now() / 1000)));

  // Calculate phase durations according to contract
  // S = block.timestamp + 2 days
  // T1 = S + 5 days
  // T2 = T1 + 1 days
  // T3 = T2 + 1 days
  const phases = {
    deposit: {
      name: "Deposit Phase (2 days)",
      start: new Date(Number(startTime - 2n * 24n * 60n * 60n) * 1000),
      end: new Date(Number(startTime) * 1000)
    },
    insurance: {
      name: "Insurance Phase (5 days)",
      start: new Date(Number(startTime) * 1000),
      end: new Date(Number(t1Time) * 1000)
    },
    withdrawal: {
      name: "Withdrawal Phase (3 days)",
      start: new Date(Number(t1Time) * 1000),
      end: new Date(Number(t2Time + 2n * 24n * 60n * 60n) * 1000)
    }
  };

  // Calculate current phase
  let status;
  if (currentTimestamp < startTime) {
    status = phases.deposit.name;
  } else if (currentTimestamp < t1Time) {
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
        AAA: formatUnits(trancheAAASupply, 6),
        AA: formatUnits(trancheAASupply, 6)
      }
    },
    isLoading,
    isError: false
  };
};
