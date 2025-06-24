import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-ignition-ethers";
import "@parity/hardhat-polkadot";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999
          }
        }
      }
    ]
  },
  resolc: {
    compilerSource: 'npm'
  },
  networks: {
    hardhat: {
      chainId: 31337,
      polkavm: true
    },
    "assethub-westend": {
      url: process.env.ASSET_HUB_WESTEND_RPC_URL || "https://westend-asset-hub-eth-rpc.polkadot.io",
      chainId: 420420421,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: 20000000,
      gasPrice: "auto",
      polkavm: true,
      timeout: 600000, // 10 minutes
      allowUnlimitedContractSize: true,
      loggingEnabled: true
    }
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts-pvm"
  }
} as any;

export default config;
