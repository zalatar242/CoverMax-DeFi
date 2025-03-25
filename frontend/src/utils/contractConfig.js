import contracts from '../contracts.json';

/**
 * Gets the current network from environment variables
 * @returns {string} Current network name ('mainnet' or 'sepolia')
 */
export const getCurrentNetwork = () => {
  return process.env.REACT_APP_DEFAULT_NETWORK || 'mainnet';
};

/**
 * Gets contract configuration for a specific contract on the current network
 * @param {string} contractName Name of the contract (e.g., 'Insurance', 'TrancheA')
 * @returns {Object} Contract configuration with address and ABI
 */
export const getContractConfig = (contractName) => {
  const network = getCurrentNetwork();
  const networkContracts = contracts.networks[network];

  if (!networkContracts || !networkContracts[contractName]) {
    throw new Error(`Contract ${contractName} not found on network ${network}`);
  }

  return networkContracts[contractName];
};

/**
 * Gets contract configurations for all tranches on the current network
 * @returns {Object} Object containing contract configs for all tranches
 */
export const getTranchesConfig = () => {
  return {
    A: getContractConfig('TrancheA'),
    B: getContractConfig('TrancheB'),
    C: getContractConfig('TrancheC')
  };
};

/**
 * Gets Insurance contract and USDC configuration
 * @returns {Object} Object containing Insurance and USDC contract configs
 */
export const getMainConfig = () => {
  return {
    Insurance: getContractConfig('Insurance'),
    USDC: getContractConfig('USDC')
  };
};

/**
 * Gets all contract configurations for the current network
 * @returns {Object} All contract configurations
 */
export const getAllContracts = () => {
  const network = getCurrentNetwork();
  return contracts.networks[network];
};
