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
    cache: "./cache-pvm",
    artifacts: "./artifacts-pvm",
  },
  resolc: {
    compilerSource: "npm",
  },
  networks: {
    hardhat: {
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
    localNode: {
      polkavm: true,
      url: `http://127.0.0.1:8545`,
      accounts: [
        process.env.LOCAL_PRIV_KEY ??
          "ac29bf2c53064d81806eb0c5158ac43a2d00e8463b24a9647c644b25638c6b1d",
      ],
    },
    passetHub: {
      polkavm: true,
      url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
      accounts: [
        process.env.LOCAL_PRIV_KEY ??
          "ac29bf2c53064d81806eb0c5158ac43a2d00e8463b24a9647c644b25638c6b1d",
      ],
    },
  }
};
