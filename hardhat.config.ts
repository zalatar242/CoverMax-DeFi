import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
    },
  },
  networks: {
    hardhat: {
      chainId: process.env.NETWORK === 'sepolia' ? 84532 : 8453,
      forking: {
        url: process.env.NETWORK === 'sepolia'
          ? process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"
          : process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
        blockNumber: process.env.NETWORK === 'sepolia' ? 5000000 : 12300000, // More recent block for Base mainnet
        enabled: process.env.FORK_ENABLED === 'true'
      },
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        accountsBalance: "10000000000000000000000" // 10000 ETH
      }
    },
    "base-mainnet": {
      url: process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
      chainId: 8453,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      "base-mainnet": process.env.BASESCAN_API_KEY || "",
      "base-sepolia": process.env.BASESCAN_API_KEY || ""
    },
    customChains: [
      {
        network: "base-mainnet",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      },
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  },
  mocha: {
    timeout: 120000 // 2 minutes
  }
};

// Add Base chain configuration
const baseChainConfig = {
  hardfork: "london",
  eip150Block: 0,
  eip155Block: 0,
  eip158Block: 0,
  byzantiumBlock: 0,
  constantinopleBlock: 0,
  petersburgBlock: 0,
  istanbulBlock: 0,
  muirGlacierBlock: 0,
  berlinBlock: 0,
  londonBlock: 0,
  arrowGlacierBlock: 0,
  grayGlacierBlock: 0,
  mergeNetsplitBlock: 0,
  terminalTotalDifficulty: 0,
  baseFeePerGas: null
};

// Apply Base chain configuration to hardhat network
config.networks!.hardhat = {
  ...config.networks!.hardhat,
  ...baseChainConfig
};

export default config;
