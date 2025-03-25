import { readContract, readContracts } from 'wagmi/actions';
import { formatUnits } from 'viem';
import Insurance from '../contracts.json';

export const getInsuranceContract = async () => {
  return {
    address: Insurance.address,
    abi: Insurance.abi
  };
};

export const fetchPortfolioData = async (contract, address) => {
  if (!contract || !address) {
    return {
      trancheA: "0",
      trancheB: "0",
      trancheC: "0",
      depositedValue: "0"
    };
  }

  try {
    // Read all balances at once
    const balances = await readContracts({
      contracts: [
        {
          ...contract,
          functionName: 'balanceOf',
          args: [address, 0n]
        },
        {
          ...contract,
          functionName: 'balanceOf',
          args: [address, 1n]
        },
        {
          ...contract,
          functionName: 'balanceOf',
          args: [address, 2n]
        }
      ]
    });

    const depositedValue = await readContract({
      ...contract,
      functionName: 'getUserDepositedValue',
      args: [address]
    });

    return {
      trancheA: formatUnits(balances[0] || 0n, 6),
      trancheB: formatUnits(balances[1] || 0n, 6),
      trancheC: formatUnits(balances[2] || 0n, 6),
      depositedValue: formatUnits(depositedValue || 0n, 6)
    };
  } catch (error) {
    console.error("Error fetching portfolio data:", error);
    throw error;
  }
};

export const fetchProtocolStatus = async (contract) => {
  if (!contract) {
    return {
      status: "Deposit Period",
      nextPhase: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  }

  try {
    const [currentPhase, phaseEndTime] = await readContracts({
      contracts: [
        {
          ...contract,
          functionName: 'getCurrentPhase'
        },
        {
          ...contract,
          functionName: 'getPhaseEndTime'
        }
      ]
    });

    const phases = ["Deposit", "Investment", "Maturity"];
    const status = phases[Number(currentPhase)] || "Unknown";
    const nextPhase = new Date(Number(phaseEndTime) * 1000).toISOString().split('T')[0];

    return { status, nextPhase };
  } catch (error) {
    console.error("Error fetching protocol status:", error);
    throw error;
  }
};
