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

// Network key mapping
const NETWORK_KEYS = {
  84532: 'base-sepolia',
  8453: 'base-mainnet',
  31337: 'hardhat'
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
  const { chainId } = useAppKitNetwork();

  // Map chain ID to network key
  const currentNetwork = NETWORK_KEYS[chainId] || 'base-sepolia';


  return {
    Insurance: getContractConfig('Insurance', currentNetwork),
    USDC: getContractConfig('USDC', currentNetwork),
    networks: NETWORK_CONFIG,
    currentNetwork,
    switchNetwork: async (networkKey) => {
      const network = NETWORK_CONFIG[networkKey];
      if (network) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${network.chainId.toString(16)}` }],
        });
      }
    }
  };
};

export const useTranchesConfig = () => {
  const { chainId } = useAppKitNetwork();

  // Map chain ID to network key
  const currentNetwork = NETWORK_KEYS[chainId] || 'base-sepolia';

  return {
    AAA: getContractConfig('TrancheAAA', currentNetwork),
    AA: getContractConfig('TrancheAA', currentNetwork)
  };
};

export const useContractsConfig = () => {
  const { chainId } = useAppKitNetwork();

  // Map chain ID to network key
  const currentNetwork = NETWORK_KEYS[chainId] || 'base-sepolia';


  const networkContracts = contracts.networks[currentNetwork];
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
