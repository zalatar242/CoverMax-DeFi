import { useWalletConnection } from './walletConnector';
import { useMainConfig, useTranchesConfig } from './contractConfig';
import { useReadContract } from 'wagmi';
import { formatUnits, numberToHex, hexToBigInt } from 'viem';

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
  const { data: trancheASupply = 0n, isLoading: loadingSupplyA } = useReadContract({
    address: tranches?.A?.address,
    abi: tranches?.A?.abi,
    functionName: 'totalSupply',
    enabled: Boolean(tranches?.A),
  });

  const { data: trancheBSupply = 0n, isLoading: loadingSupplyB } = useReadContract({
    address: tranches?.B?.address,
    abi: tranches?.B?.abi,
    functionName: 'totalSupply',
    enabled: Boolean(tranches?.B),
  });

  const { data: trancheCSupply = 0n, isLoading: loadingSupplyC } = useReadContract({
    address: tranches?.C?.address,
    abi: tranches?.C?.abi,
    functionName: 'totalSupply',
    enabled: Boolean(tranches?.C),
  });

  // Calculate total TVL
  const totalTVL = trancheASupply + trancheBSupply + trancheCSupply;

  const currentTimestamp = hexToBigInt(numberToHex(Math.floor(Date.now() / 1000)));

  // Calculate phase durations according to contract
  // S = block.timestamp + 2 days
  // T1 = S + 5 days
  // T2 = T1 + 1 days
  // T3 = T2 + 1 days
  // T4 = T3 + 1 days
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

  let status;
  if (currentTimestamp < startTime) {
    status = phases.deposit.name;
  } else if (currentTimestamp < t1Time) {
    status = phases.insurance.name;
  } else {
    status = phases.withdrawal.name;
  }

  const isLoading = loadingS || loadingT1 || loadingT2 ||
                    loadingSupplyA || loadingSupplyB || loadingSupplyC;

  return {
    status,
    phases,
    tvl: {
      total: formatUnits(totalTVL, 6),
      byTranche: {
        A: formatUnits(trancheASupply, 6),
        B: formatUnits(trancheBSupply, 6),
        C: formatUnits(trancheCSupply, 6)
      }
    },
    isLoading,
    isError: false
  };
};
