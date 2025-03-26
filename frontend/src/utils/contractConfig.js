import contracts from '../contracts.json';
import { hardhat } from '@reown/appkit/networks';
import { useAppKitNetwork } from '@reown/appkit/react';

const getContractConfig = (networkName, contractName) => {
  // For local development, use 'hardhat' network contracts
  const networkContracts = contracts.networks[networkName === 'hardhat' ? 'hardhat' : networkName];

  if (!networkContracts || !networkContracts[contractName]) {
    console.error(`Contract ${contractName} not found on network ${networkName}`);
    return null;
  }

  return networkContracts[contractName];
};

export const useMainConfig = () => {
  const { chainId } = useAppKitNetwork();
  // Default to hardhat for development
  const networkName = chainId === hardhat.id ? 'hardhat' : 'base';
  return {
    Insurance: getContractConfig(networkName, 'Insurance'),
    USDC: getContractConfig(networkName, 'USDC')
  };
};

export const useTranchesConfig = () => {
  const { chainId } = useAppKitNetwork();
  // Default to hardhat for development
  const networkName = chainId === hardhat.id ? 'hardhat' : 'base';

  return {
    A: getContractConfig(networkName, 'TrancheA'),
    B: getContractConfig(networkName, 'TrancheB'),
    C: getContractConfig(networkName, 'TrancheC')
  };
};

export const useContractsConfig = () => {
  const { chainId } = useAppKitNetwork();
  const networkName = chainId === hardhat.id ? 'hardhat' : 'base';
  return contracts.networks[networkName];
};
