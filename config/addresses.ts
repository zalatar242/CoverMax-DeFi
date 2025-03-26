export const networks =   {
    mainnet: {
      USDC_ADDRESS: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      AAVE_V3_POOL: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
      AAVE_DATA_PROVIDER: "0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac",
      MOONWELL_COMPTROLLER: "0xfBb21d0380beE3312B33c4353c8936a0F13EF26C",
      MOONWELL_USDC: "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22",
      COMPOUND_USDC_MARKET: "0xb125E6687d4313864e53df431d5425969c15Eb2F",
      chainId: 8453,
      blockExplorerUrl: "https://basescan.org",
      defaultRpcUrl: "https://mainnet.base.org",
      USDC_WHALE: "0x6c561B446416E1A00E8E93E221854d6eA4171372"
    },
    hardhat: {
  "USDC_ADDRESS": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "AAVE_V3_POOL": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  "AAVE_DATA_PROVIDER": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  "MOONWELL_COMPTROLLER": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  "MOONWELL_USDC": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  "COMPOUND_USDC_MARKET": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  "chainId": 31337,
  "blockExplorerUrl": "http://localhost:8545",
  "defaultRpcUrl": "http://localhost:8545",
  "USDC_WHALE": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
}
  } as const;

export type NetworkConfig = typeof networks.mainnet;
export type NetworkName = keyof typeof networks;
