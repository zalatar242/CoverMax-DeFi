# CoverMax-DeFi

A DeFi insurance protocol that provides yield-enhanced protection through tranche-based risk segmentation.

## Overview

CoverMax-DeFi is a decentralized insurance protocol that allows users to:
- Deposit funds into risk-segmented tranches (A, B, C)
- Earn yield from leading DeFi protocols (Aave, Compound, Moonwell)
- Get protection against smart contract risks
- Trade risk/reward preferences through tranche positions

## Architecture

The protocol consists of these main components:

- `Insurance.sol` - Core insurance contract managing deposits and risk tranches
- `Tranche.sol` - Risk-segmented token contracts (A, B, C tranches)
- Lending Adapters:
  - `AaveLendingAdapter.sol` - Integration with Aave V3
  - `CompoundLendingAdapter.sol` - Integration with Compound V3
  - `MoonwellLendingAdapter.sol` - Integration with Moonwell

## Quick Start

1. Install dependencies:
```bash
yarn install
```

2. Set up environment:
```bash
cp .env.example .env
```

3. Start local node:
```bash
npx hardhat node
```

4. Deploy contracts:
```bash
npx hardhat run scripts/deploy-local.ts --network localhost
```

For detailed local development instructions, including testing and troubleshooting, see [Local Development Guide](LOCAL_DEVELOPMENT.md).

## Documentation

- [Local Development Guide](LOCAL_DEVELOPMENT.md) - Complete guide for local development, testing, and debugging
- [Scripts Documentation](scripts/README.md) - Details about deployment scripts and configuration

## Deployment

### Local Development
See [Local Development Guide](LOCAL_DEVELOPMENT.md) for detailed instructions on setting up a local development environment.

### Production Deployment

1. Configure environment:
```bash
# Set deployment private key
DEPLOYER_PRIVATE_KEY=your_private_key

# Set block explorer API key (for verification)
BASESCAN_API_KEY=your_api_key
```

2. Deploy to mainnet:
```bash
npx hardhat run scripts/deploy-mainnet.ts --network base-mainnet
```

## Testing

```bash
# Run all tests
yarn test

# Run specific test file
yarn test test/Insurance.mainnet.test.ts

# Run coverage
yarn coverage
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## Security

### Audits
- Audit 1: [Link to audit report]
- Audit 2: [Link to audit report]

### Bug Bounty
Our bug bounty program details can be found at [Link to bug bounty]

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
