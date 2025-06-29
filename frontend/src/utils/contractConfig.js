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
  }
};

// Network key mapping
const NETWORK_KEYS = {
  420420422: 'passetHub'
};

const getContractConfig = (contractName, currentNetwork) => {
  const network = currentNetwork || process.env.REACT_APP_DEFAULT_NETWORK || 'passetHub';
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
  const currentNetwork = NETWORK_KEYS[chainId] || 'passetHub';


  return {
    Insurance: getContractConfig('Insurance', currentNetwork),
    USDC: getContractConfig('USDC', currentNetwork),
    UniswapV2Router02: getContractConfig('UniswapV2Router02', currentNetwork),
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
  const currentNetwork = NETWORK_KEYS[chainId] || 'passetHub';

  return {
    AAA: getContractConfig('TrancheAAA', currentNetwork),
    AA: getContractConfig('TrancheAA', currentNetwork)
  };
};

export const useContractsConfig = () => {
  const { chainId } = useAppKitNetwork();

  // Map chain ID to network key
  const currentNetwork = NETWORK_KEYS[chainId] || 'passetHub';


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
