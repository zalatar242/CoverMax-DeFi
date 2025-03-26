import contracts from '../contracts.json';
import { useAppKitNetwork } from '@reown/appkit/react';

const getContractConfig = (contractName) => {
  const networkContracts = contracts.networks.hardhat;

  if (!networkContracts || !networkContracts[contractName]) {
    console.error(`Contract ${contractName} not found in hardhat network config`);
    return null;
  }

  return networkContracts[contractName];
};

export const useMainConfig = () => {
  return {
    Insurance: getContractConfig('Insurance'),
    USDC: getContractConfig('USDC')
  };
};

export const useTranchesConfig = () => {
  return {
    A: getContractConfig('TrancheA'),
    B: getContractConfig('TrancheB'),
    C: getContractConfig('TrancheC')
  };
};

export const useContractsConfig = () => {
  return contracts.networks.hardhat;
};
