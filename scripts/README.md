# Deployment Scripts

This directory contains the deployment scripts for the CoverMax-DeFi project. The scripts are organized into a modular structure for better maintainability and reuse.

## Structure

```
scripts/
├── core/                   # Core deployment modules
│   ├── deployMocks.ts     # Mock contracts deployment
│   └── deployCore.ts      # Core contracts deployment
├── utils/                 # Utility functions
│   └── config.ts         # Configuration update utilities
├── deploy-local.ts       # Local development deployment
└── deploy-mainnet.ts     # Mainnet deployment
```

## Usage

### Local Development

To deploy all contracts locally with mocks:

```bash
npx hardhat run scripts/deploy-local.ts --network hardhat
```

This will:
1. Deploy all mock contracts (USDC, Aave, Moonwell)
2. Update the local network configuration
3. Deploy core contracts (Insurance, Adapters, AAA/AA Tranches)
4. Update the frontend configuration

### Mainnet Deployment

To deploy on mainnet:

```bash
npx hardhat run scripts/deploy-mainnet.ts --network base-mainnet
```

This will:
1. Use existing mainnet addresses for external contracts
2. Deploy core contracts (Insurance, Adapters, AAA/AA Tranches)
3. Verify all contracts on the block explorer
4. Update the frontend configuration

## Configuration

The deployment process updates two configuration files:

1. `config/addresses.ts` - Contains network-specific addresses for external contracts
2. `frontend/src/contracts.json` - Contains deployed contract addresses for the frontend

These files are automatically updated during deployment to ensure consistency across the application.
