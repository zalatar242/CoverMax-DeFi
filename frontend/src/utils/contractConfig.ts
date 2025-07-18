import contracts from '../contracts.json';
import { useAppKitNetwork } from '@reown/appkit/react';

const NETWORK_CONFIG = {
  passetHub: {
    name: 'Passet Hub',
    chainId: 420420422,
    rpcUrl: process.env.REACT_APP_PASSETHUB_RPC_URL || 'https://testnet-passet-hub-eth-rpc.polkadot.io/',
    nativeCurrency: {
      symbol: 'DOT',
      decimals: 18
    }
  },
  localhost: {
    name: 'Localhost Hardhat',
    chainId: 31337,
    rpcUrl: 'http://localhost:8545',
    nativeCurrency: {
      symbol: 'ETH',
      decimals: 18
    }
  }
};

// Network key mapping
const NETWORK_KEYS: Record<number, string> = {
  420420422: 'passetHub',
  31337: 'localhost'
};

const getContractConfig = (contractName: string, currentNetwork: string) => {
  const network = currentNetwork || process.env.REACT_APP_DEFAULT_NETWORK || 'passetHub';
  const networkContracts = (contracts.networks as any)[network];

  if (!networkContracts || !networkContracts[contractName]) {
    console.error(`Contract ${contractName} not found in ${network} network config`);
    return null;
  }

  return {
    ...networkContracts[contractName],
    network: (NETWORK_CONFIG as any)[network]
  };
};

export const useMainConfig = () => {
  const { chainId } = useAppKitNetwork();

  // Map chain ID to network key
  const currentNetwork = NETWORK_KEYS[chainId as number] || 'passetHub';


  return {
    Insurance: getContractConfig('Insurance', currentNetwork),
    USDC: getContractConfig('USDC', currentNetwork),
    UniswapV2Router02: getContractConfig('UniswapV2Router02', currentNetwork),
    networks: NETWORK_CONFIG,
    currentNetwork,
    switchNetwork: async (networkKey: string) => {
      const network = (NETWORK_CONFIG as any)[networkKey];
      if (network) {
        await (window as any).ethereum.request({
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
  const currentNetwork = NETWORK_KEYS[chainId as number] || 'passetHub';

  return {
    AAA: getContractConfig('TrancheAAA', currentNetwork),
    AA: getContractConfig('TrancheAA', currentNetwork)
  };
};

export const useContractsConfig = () => {
  const { chainId } = useAppKitNetwork();

  // Map chain ID to network key
  const currentNetwork = NETWORK_KEYS[chainId as number] || 'passetHub';


  const networkContracts = (contracts.networks as any)[currentNetwork];
  if (!networkContracts) {
    console.error(`No contracts found for network: ${currentNetwork}`);
  }

  return {
    ...(networkContracts || {}),
    network: (NETWORK_CONFIG as any)[currentNetwork],
    networks: NETWORK_CONFIG,
    currentNetwork
  };
};
