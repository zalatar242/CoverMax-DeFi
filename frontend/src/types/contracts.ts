export interface ContractConfig {
  address: string;
  abi: any[];
}

export interface NetworkConfig {
  [contractName: string]: ContractConfig;
}

export interface ContractsData {
  networks: {
    [networkName: string]: NetworkConfig;
  };
}

export interface TokenConfig {
  address: string;
  symbol: string;
  decimals: number;
  name?: string;
}

export interface PoolConfig {
  address: string;
  token0: string;
  token1: string;
  fee: number;
}