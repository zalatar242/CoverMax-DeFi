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
        runs: 1000,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: process.env.TEST_ON_BASE === "true" ? "./cache" : "./cache-pvm",
    artifacts: process.env.TEST_ON_BASE === "true" ? "./artifacts" : "./artifacts-pvm",
  },
  resolc: {
    compilerSource: "npm",
  },
  networks: {
    hardhat: process.env.TEST_ON_BASE === "true" ? {
      // Base local testing config when explicitly requested
      forking: {
        url: "https://mainnet.base.org",
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
