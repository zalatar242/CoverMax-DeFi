require("@nomicfoundation/hardhat-toolbox");
require("@parity/hardhat-polkadot");

require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
const path = require("path");

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: process.env.TEST_ON_MOONBEAM === "true" ? "./cache" : "./cache-pvm",
    artifacts: process.env.TEST_ON_MOONBEAM === "true" ? "./artifacts" : "./artifacts-pvm",
  },
  resolc: {
    compilerSource: "npm",
    settings: {
      optimizer: {
        enabled: true,
        parameters: 'z',
        fallbackOz: true,
        runs: 10000,
      },
      standardJson: true,
    },
  },
  networks: {
    hardhat: process.env.TEST_ON_MOONBEAM === "true" ? {
      // Moonbeam local testing config when explicitly requested
      forking: {
        url: "https://rpc.api.moonbeam.network",
        enabled: true,
      },
    } : {
      // Default PolkaVM config
      polkavm: true,
      nodeConfig: {
        nodeBinaryPath: "./bin/substrate-node",
        rpcPort: 8000,
        dev: true,
      },
      adapterConfig: {
        adapterBinaryPath: "./bin/eth-rpc",
        dev: true,
      },
    },
    passetHub: {
      polkavm: true,
      url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
      accounts: [
        process.env.PRIVATE_KEY,
      ],
    },
  }
};
