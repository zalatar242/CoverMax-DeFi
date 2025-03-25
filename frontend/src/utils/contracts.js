import { readContract, readContracts } from 'wagmi/actions';
import { formatUnits } from 'viem';
import { getMainConfig, getTranchesConfig } from './contractConfig';

export const getInsuranceContract = async () => {
  const { Insurance } = getMainConfig();
  return Insurance;
};

export const fetchPortfolioData = async (address) => {
  if (!address) {
    return {
      trancheA: "0",
      trancheB: "0",
      trancheC: "0",
      depositedValue: "0"
    };
  }

  try {
    const insurance = await getInsuranceContract();
    const tranches = getTranchesConfig();

    // Read all balances at once
    const balances = await readContracts({
      contracts: [
        {
          ...tranches.A,
          functionName: 'balanceOf',
          args: [address]
        },
        {
          ...tranches.B,
          functionName: 'balanceOf',
          args: [address]
        },
        {
          ...tranches.C,
          functionName: 'balanceOf',
          args: [address]
        }
      ]
    });

    const depositedValue = await readContract({
      ...insurance,
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

export const fetchProtocolStatus = async () => {
  const insurance = await getInsuranceContract();

  try {
    const [isInvested, inLiquidMode] = await readContracts({
      contracts: [
        {
          ...insurance,
          functionName: 'isInvested'
        },
        {
          ...insurance,
          functionName: 'inLiquidMode'
        }
      ]
    });

    let status;
    if (!isInvested) {
      status = "Deposit Period";
    } else if (!inLiquidMode) {
      status = "Investment Period";
    } else {
      status = "Claim Period";
    }

    // Get next phase date - this would need to be calculated based on contract periods
    const nextPhase = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return { status, nextPhase };
  } catch (error) {
    console.error("Error fetching protocol status:", error);
    throw error;
  }
};
