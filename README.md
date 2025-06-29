# CoverMax-DeFi

A DeFi insurance protocol that provides yield-enhanced protection through tranche-based risk segmentation.

## Overview

CoverMax-DeFi is a decentralized insurance protocol that allows users to:

- Deposit funds into risk-segmented tranches (AAA, AA)
- Earn yield from leading DeFi protocols (Aave, Moonwell)
- Get protection against smart contract risks
- Trade risk/reward preferences through tranche positions

For detailed protocol documentation, see [PROTOCOL.md](PROTOCOL.md).

## Architecture

The protocol consists of these main components:

- `Insurance.sol` - Core insurance contract managing deposits and risk tranches
- `Tranche.sol` - Risk-segmented token contracts (AAA, AA tranches)
- Lending Adapters:
  - `AaveLendingAdapter.sol` - Integration with Aave V3
  - `MoonwellLendingAdapter.sol` - Integration with Moonwell

## Environment Setup

CoverMax-DeFi supports two testing environments:

1. **PolkaVM (Default)** - For PassethHub development and deployment
2. **Base Chain** - For testing contract behavior on Base mainnet fork

### Environment Configuration

```bash
cp .env.example .env
# Edit .env with your private key (only needed for PassethHub deployment)
```

## Quick Start

### Default Development (PolkaVM)

1. Install dependencies:

```bash
npm install --legacy-peer-deps --force
```

2. Run tests (uses PolkaVM by default - may not work!):

```bash
npx hardhat test
```

3. Deploy to PassethHub:

```bash
npx hardhat run scripts/deploy.ts --network passetHub
```

### Base Chain Testing

When you need to test contract behavior against Base mainnet protocols:

```bash
# Test on Base mainnet fork
TEST_ON_BASE=true npx hardhat test
```

This uses Hardhat's forking capability to test against real Base mainnet state.

## Local Development

### What Gets Deployed

The deployment process sets up:

1. Mock External Contracts:

   - Mock USDC
   - Mock Aave (Pool, DataProvider)
   - Mock Moonwell (mToken, Comptroller)

2. Core Protocol:
   - Insurance contract
   - Lending adapters (Aave, Moonwell)
   - Tranches (AAA, AA)

### Frontend Setup

1. Install frontend dependencies:

```bash
cd frontend
npm install --legacy-peer-deps --force
```

2. Set up frontend environment:

```bash
cp .env.example .env
```

3. Start the development server:

```bash
npm start
```

### MetaMask Configuration

1. Configure MetaMask for local development:

   - Network Name: Hardhat Local
   - RPC URL: http://localhost:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

2. Import test account:
   - Copy private key from Hardhat node output
   - Import into MetaMask using "Import Account"

### Troubleshooting

Common issues and solutions:

1. "Nonce too high" error

   - Reset MetaMask account (Settings -> Advanced -> Reset Account)
   - Restart Hardhat node and redeploy

2. Transaction failures

   - Check ETH balance for gas
   - Verify USDC approval and balance
   - Confirm correct signer/account

3. Frontend connection issues
   - Verify MetaMask network settings
   - Check contract addresses in frontend config
   - Clear browser cache

## Documentation

- [Scripts Documentation](scripts/README.md) - Details about deployment scripts and configuration

## Deployment

### Production Deployment

1. Configure environment:

```bash
# Set deployment private key
DEPLOYER_PRIVATE_KEY=your_private_key

# Set block explorer API key (for verification)
BASESCAN_API_KEY=your_api_key
```

## Testing

### Default Testing (PolkaVM)

```bash
# Run all tests on PolkaVM (default)
npx hardhat test

# Run specific test file
npx hardhat test test/Insurance.test.ts

# Run coverage
npm run coverage
```

### Base Chain Testing

```bash
# Test against Base mainnet fork
TEST_ON_BASE=true npx hardhat test

# Test specific file on Base
TEST_ON_BASE=true npx hardhat test test/Insurance.mainnet.test.ts
```

**When to use Base Chain testing:**

- Testing integrations with real Aave/Moonwell protocols
- Validating against actual Base mainnet state
- Performance testing with real liquidity conditions

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the Business Source License - see the [LICENSE](LICENSE) file for details.
