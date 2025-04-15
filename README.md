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

## Quick Start

1. Install dependencies:

```bash
npm install --legacy-peer-deps --force
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

For more detailed instructions, see [Local Development Guide](LOCAL_DEVELOPMENT.md).

## Documentation

- [Local Development Guide](LOCAL_DEVELOPMENT.md) - Complete guide for local development, testing, and debugging
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

2. Deploy to mainnet:

```bash
npx hardhat run scripts/deploy-mainnet.ts --network base-mainnet
```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test test/Insurance.mainnet.test.ts

# Run coverage
npm run coverage
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
