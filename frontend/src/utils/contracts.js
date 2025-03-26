import { useWalletConnection } from './walletConnector';
import { useMainConfig, useTranchesConfig } from './contractConfig';
import { useReadContract } from 'wagmi';
import { formatUnits, parseEther } from 'viem';

export const useUSDCBalance = () => {
  const { address, isConnected } = useWalletConnection();
  const { USDC } = useMainConfig();

  console.log('Wallet Status:', { address, isConnected });
  console.log('USDC Contract:', {
    address: USDC?.address,
    hasFunctions: USDC?.abi?.some(item => item.type === 'function'),
    functions: USDC?.abi?.filter(item => item.type === 'function').map(f => f.name)
  });

  const enabled = Boolean(address && USDC);
  const callConfig = {
    address: USDC?.address,
    abi: USDC?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled
  };
  console.log('Contract Call Config:', callConfig);

  const { data, error, isError, isLoading } = useReadContract({
    address: USDC?.address,
    abi: USDC?.abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: Boolean(address && USDC),
  });

  console.log('USDC Balance Data:', data);
  if (error) console.log('USDC Balance Error:', error);

  return {
    balance: data ? formatUnits(data, 6) : "0",
    isError,
    isLoading
  };
};

export const usePortfolioData = () => {
  const { address, isConnected } = useWalletConnection();
  const { Insurance } = useMainConfig();
  const tranches = useTranchesConfig();

  console.log('Portfolio Wallet Status:', { address, isConnected });
  console.log('Insurance Contract:', {
    address: Insurance?.address,
    hasFunctions: Insurance?.abi?.some(item => item.type === 'function'),
    functions: Insurance?.abi?.filter(item => item.type === 'function').map(f => f.name)
  });
  console.log('Tranches Config:', {
    A: { address: tranches?.A?.address, hasFunctions: tranches?.A?.abi?.some(item => item.type === 'function') },
    B: { address: tranches?.B?.address, hasFunctions: tranches?.B?.abi?.some(item => item.type === 'function') },
    C: { address: tranches?.C?.address, hasFunctions: tranches?.C?.abi?.some(item => item.type === 'function') }
  });

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

  // Mock values for deposited value until it's added to the contract
  const depositedValueData = "0";
  const loadingDeposited = false;
  const errorDeposited = null;

  console.log('Tranche Balance Data:', {
    A: trancheAData,
    B: trancheBData,
    C: trancheCData,
    deposited: depositedValueData
  });

  if (errorA) console.log('Tranche A Error:', errorA);
  if (errorB) console.log('Tranche B Error:', errorB);
  if (errorC) console.log('Tranche C Error:', errorC);
  if (errorDeposited) console.log('Deposited Value Error:', errorDeposited);

  const result = {
    trancheA: trancheAData ? formatUnits(trancheAData, 6) : "0",
    trancheB: trancheBData ? formatUnits(trancheBData, 6) : "0",
    trancheC: trancheCData ? formatUnits(trancheCData, 6) : "0",
    depositedValue: depositedValueData ? formatUnits(depositedValueData, 6) : "0",
    isLoading: loadingA || loadingB || loadingC || loadingDeposited,
    isError: errorA || errorB || errorC || errorDeposited
  };

  console.log('Portfolio Result:', result);
  return result;
};

export const useProtocolStatus = () => {
  const { Insurance } = useMainConfig();

  const { data: isInvestedData = false } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'isInvested',
    enabled: Boolean(Insurance),
  });

  const { data: inLiquidModeData = false } = useReadContract({
    address: Insurance?.address,
    abi: Insurance?.abi,
    functionName: 'inLiquidMode',
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

  return {
    status,
    tvl: { total: "0", byTranche: { A: "0", B: "0", C: "0" } },
    apy: { A: "0", B: "0", C: "0" },
    isLoading: false,
    isError: false
  };
};
