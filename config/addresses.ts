export const networks = {
    mainnet: {
        // USDC token
        USDC_ADDRESS: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",

        // Aave V3
        AAVE_V3_POOL: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
        AAVE_DATA_PROVIDER: "0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac",

        // Moonwell
        MOONWELL_COMPTROLLER: "0xfBb21d0380beE3312B33c4353c8936a0F13EF26C",
        MOONWELL_USDC: "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22",

        // Compound
        COMPOUND_USDC_MARKET: "0xb125E6687d4313864e53df431d5425969c15Eb2F", // Compound III (Comet) USDC market

        // Base Chain Info
        chainId: 8453,
        blockExplorerUrl: "https://basescan.org",
        defaultRpcUrl: "https://mainnet.base.org",

        // Testing accounts
        USDC_WHALE: "0x6c561B446416E1A00E8E93E221854d6eA4171372"
    }
} as const;

export type NetworkConfig = typeof networks.mainnet;
export type NetworkName = keyof typeof networks;
