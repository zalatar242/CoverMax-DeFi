import contracts from '../contracts.json';
import { useAppKitNetwork } from '@reown/appkit/react';

interface NativeCurrency {
  symbol: string;
  decimals: number;
}

interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  nativeCurrency: NativeCurrency;
}

interface NetworkConfigs {
  [key: string]: NetworkConfig;
}

interface ContractData {
  address: string;
  abi: any[];
}

interface NetworkContracts {
  [contractName: string]: ContractData;
}

interface Contracts {
  networks: {
    [networkName: string]: NetworkContracts;
  };
}

interface WindowWithEthereum extends Window {
  ethereum?: {
    request: (args: { method: string; params: any[] }) => Promise<any>;
  };
}

declare const window: WindowWithEthereum;

const NETWORK_CONFIG: NetworkConfigs = {
  hardhat: {
    name: 'Hardhat Local',
    chainId: 31337,
    rpcUrl: 'http://localhost:8545',
    nativeCurrency: {
      symbol: 'ETH',
      decimals: 18
    }
  },
  mainnet: {
    name: 'Base Mainnet',
    chainId: 8453,
    rpcUrl: process.env.REACT_APP_MAINNET_RPC_URL || '',
    nativeCurrency: {
      symbol: 'ETH',
      decimals: 18
    }
  },
  'base-sepolia': {
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    nativeCurrency: {
      symbol: 'ETH',
      decimals: 18
    }
  }
};

const NETWORK_KEYS: Record<number, string> = {
  84532: 'base-sepolia',
  8453: 'base-mainnet',
  31337: 'hardhat'
};

const getContractConfig = (contractName: string, currentNetwork?: string): (ContractData & { network: NetworkConfig }) | null => {
  const network = currentNetwork || process.env.REACT_APP_DEFAULT_NETWORK || 'base-sepolia';
  const networkContracts = (contracts as Contracts).networks[network];

  if (!networkContracts || !networkContracts[contractName]) {
    console.error(`Contract ${contractName} not found in ${network} network config`);
    return null;
  }

  return {
    ...networkContracts[contractName],
    network: NETWORK_CONFIG[network]
  };
};

interface MainConfig {
  Insurance: (ContractData & { network: NetworkConfig }) | null;
  USDC: (ContractData & { network: NetworkConfig }) | null;
  UniswapV2Router02: (ContractData & { network: NetworkConfig }) | null;
  networks: NetworkConfigs;
  currentNetwork: string;
  switchNetwork: (networkKey: string) => Promise<void>;
}

export const useMainConfig = (): MainConfig => {
  const { chainId } = useAppKitNetwork();
  const numericChainId = Number(chainId ?? 84532); // Convert to number with fallback
  const currentNetwork = NETWORK_KEYS[numericChainId] || 'base-sepolia';

  return {
    Insurance: getContractConfig('Insurance', currentNetwork),
    USDC: getContractConfig('USDC', currentNetwork),
    UniswapV2Router02: getContractConfig('UniswapV2Router02', currentNetwork),
    networks: NETWORK_CONFIG,
    currentNetwork,
    switchNetwork: async (networkKey: string) => {
      const network = NETWORK_CONFIG[networkKey];
      if (network && window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${network.chainId.toString(16)}` }],
        });
      }
    }
  };
};

interface TranchesConfig {
  AAA: (ContractData & { network: NetworkConfig }) | null;
  AA: (ContractData & { network: NetworkConfig }) | null;
}

export const useTranchesConfig = (): TranchesConfig => {
  const { chainId } = useAppKitNetwork();
  const numericChainId = Number(chainId ?? 84532);
  const currentNetwork = NETWORK_KEYS[numericChainId] || 'base-sepolia';

  return {
    AAA: getContractConfig('TrancheAAA', currentNetwork),
    AA: getContractConfig('TrancheAA', currentNetwork)
  };
};

interface ExtendedContractsConfig {
  [key: string]: ContractData | NetworkConfig | NetworkConfigs | string;
  network: NetworkConfig;
  networks: NetworkConfigs;
  currentNetwork: string;
}

export const useContractsConfig = (): ExtendedContractsConfig => {
  const { chainId } = useAppKitNetwork();
  const numericChainId = Number(chainId ?? 84532);
  const currentNetwork = NETWORK_KEYS[numericChainId] || 'base-sepolia';

  const networkContracts = (contracts as Contracts).networks[currentNetwork];
  if (!networkContracts) {
    console.error(`No contracts found for network: ${currentNetwork}`);
  }

  return {
    ...(networkContracts || {}),
    network: NETWORK_CONFIG[currentNetwork],
    networks: NETWORK_CONFIG,
    currentNetwork
  };
};
