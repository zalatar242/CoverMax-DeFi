import contracts from '../contracts.json';
import { useAppKitNetwork } from '@reown/appkit/react';

const NETWORK_CONFIG = {
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
    rpcUrl: process.env.REACT_APP_MAINNET_RPC_URL,
    nativeCurrency: {
      symbol: 'ETH',
      decimals: 18
    }
  },
  'base-sepolia': { // Changed from 'sepolia' to match contracts.json
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    nativeCurrency: {
      symbol: 'ETH',
      decimals: 18
    }
  }
};

const getContractConfig = (contractName, currentNetwork) => {
  const network = currentNetwork || process.env.REACT_APP_DEFAULT_NETWORK || 'base-sepolia';
  const networkContracts = contracts.networks[network];

  if (!networkContracts || !networkContracts[contractName]) {
    console.error(`Contract ${contractName} not found in ${network} network config`);
    return null;
  }

  return {
    ...networkContracts[contractName],
    network: NETWORK_CONFIG[network]
  };
};

export const useMainConfig = () => {
  const { network: appKitNetwork, switchNetwork } = useAppKitNetwork();

  // Map the appkit network to our network config
  const currentNetwork = Object.keys(NETWORK_CONFIG).find(
    key => NETWORK_CONFIG[key].chainId === appKitNetwork?.chainId
  ) || process.env.REACT_APP_DEFAULT_NETWORK || 'mainnet';

  return {
    Insurance: getContractConfig('Insurance', currentNetwork),
    USDC: getContractConfig('USDC', currentNetwork),
    networks: NETWORK_CONFIG,
    currentNetwork,
    switchNetwork: async (networkKey) => {
      const network = NETWORK_CONFIG[networkKey];
      if (network) {
        await switchNetwork(network);
      }
    }
  };
};

export const useTranchesConfig = () => {
  const { network: appKitNetwork } = useAppKitNetwork();
  const currentNetwork = Object.keys(NETWORK_CONFIG).find(
    key => NETWORK_CONFIG[key].chainId === appKitNetwork?.chainId
  ) || process.env.REACT_APP_DEFAULT_NETWORK || 'mainnet';

  return {
    A: getContractConfig('TrancheA', currentNetwork),
    B: getContractConfig('TrancheB', currentNetwork),
    C: getContractConfig('TrancheC', currentNetwork)
  };
};

export const useContractsConfig = () => {
  const { network: appKitNetwork } = useAppKitNetwork();
  const currentNetwork = Object.keys(NETWORK_CONFIG).find(
    key => NETWORK_CONFIG[key].chainId === appKitNetwork?.chainId
  ) || process.env.REACT_APP_DEFAULT_NETWORK || 'mainnet';

  return {
    ...contracts.networks[currentNetwork],
    network: NETWORK_CONFIG[currentNetwork],
    networks: NETWORK_CONFIG,
    currentNetwork
  };
};
