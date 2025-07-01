# CoverMax-DeFi

A decentralized insurance protocol on Polkadot Asset Hub that implements a two-tranche risk allocation system for DeFi lending, providing users with different risk-reward profiles while maximizing capital efficiency.

## What it does

- **Risk Tranching**: Deposit USDC and receive AAA (senior) and AA (junior) tranche tokens
- **Yield Generation**: Earn yield from integrated lending protocols (Aave and Moonwell)
- **Risk Protection**: Senior tranches get priority in loss absorption scenarios
- **Liquidity**: Trade tranche tokens on integrated Uniswap V2 pools (coming soon)
- **Automated Cycles**: Protocol operates in fixed time periods for deposits, lending, and claims

## Quick Start

### Prerequisites

- Node.js v16+ and npm
- MetaMask or compatible Web3 wallet
- Some ETH on Polkadot Asset Hub for gas fees

### 1. Setup Development Environment

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run coverage

# Compile contracts
npm run compile
```

### 2. Deploy Contracts (optional - already deployed on testnet)

```bash
# Deploy to Polkadot Asset Hub
npm run deploy
```

### 3. Run Frontend

```bash
cd frontend
npm install
npm start
```

The frontend will be available at http://localhost:3000

## Live Contracts (Polkadot Asset Hub Testnet)

| Contract                   | Address                                      | Description             |
| -------------------------- | -------------------------------------------- | ----------------------- |
| **InsuranceCore**          | `0xBFBeD4E55F8d6fa19F0dd9986C7045eF45647dcd` | Main protocol contract  |
| **TrancheAAA**             | `0x1c780207B0Ac77a93C10d9078C4F51Fcf94C7145` | Senior tranche token    |
| **TrancheAA**              | `0xc4a1bb44c3BB4886019210993834971CfCe52DF2` | Junior tranche token    |
| **USDC**                   | `0xD17Aef210dEC93D3521950E18aB8783e4e488Fd4` | Base asset (6 decimals) |
| **InsuranceTimeManager**   | `0xB960eC68282Ab2d9BfB5b93e00D046416BccDCc2` | Time period manager     |
| **InsuranceClaimManager**  | `0x7C16d360f88e502DC241aCC7E705249Bcf6D6dC5` | Claims processor        |
| **AaveLendingAdapter**     | `0x9A96b128161cFc0C42f9e05cCd4dD2EAE54B6515` | Aave integration        |
| **MoonwellLendingAdapter** | `0x820d093ABA5cEC9D7dd0096A77660287D96BB2B6` | Moonwell integration    |
| **UniswapV2Factory**       | `0xEF76a5cd6AE0B6fc1cCA68df3398De44AC4c73Ba` | DEX factory             |
| **UniswapV2Router02**      | `0xCca3E8C9Cb2AE9DcD74C29f53804A1217fB6FBfe` | DEX router              |

## How to Use

### Connect to Polkadot Asset Hub

Add to MetaMask:

- **Network Name**: Polkadot Asset Hub Testnet
- **RPC URL**: `https://testnet-passet-hub-eth-rpc.polkadot.io/`
- **Chain ID**: `420420422`
- **Currency Symbol**: ETH
- **Block Explorer**: (Coming soon)

### Basic Operations

```javascript
// 1. Approve USDC spending
await usdc.approve(insuranceAddress, amount);

// 2. Deposit USDC (receives equal AAA and AA tokens)
await insurance.splitRisk(100 * 10 ** 6); // 100 USDC

// 3. Check balances
const aaaBalance = await trancheAAA.balanceOf(userAddress);
const aaBalance = await trancheAA.balanceOf(userAddress);

// 4. Claim after divestment period
await insurance.claimAll(); // Claims all tranches
// or claim specific amounts
await insurance.claim(aaaAmount, aaAmount);
```

### Protocol Time Periods

1. **Issuance Period** (2 days): Deposit phase
2. **Insurance Period** (5 days): Funds deployed to lending protocols
3. **Divestment Period** (1 day): Funds withdrawn from protocols
4. **Claim Period** (1 day): Users can claim their USDC

## Architecture

### Core Contracts

- **InsuranceCore**: Main protocol logic for deposits, investments, and claims
- **InsuranceTimeManager**: Manages protocol time periods and state transitions
- **InsuranceClaimManager**: Processes claims and calculates payouts
- **InsuranceCalculator**: Mathematical calculations for tranche distributions
- **InsuranceAdapterManager**: Registry and management of lending adapters

### Token Contracts

- **Tranche**: ERC20 implementation for AAA and AA risk tokens
- **USDC**: Base asset for the protocol (6 decimals)

### Integration Contracts

- **Lending Adapters**: Modular adapters for Aave and Moonwell
- **Uniswap V2**: DEX infrastructure for tranche token trading

### Risk Model

- **AAA Tranche**: Senior position, first priority in payouts, lower risk
- **AA Tranche**: Junior position, absorbs first losses, higher risk/reward

## Development

### Technology Stack

- **Smart Contracts**: Solidity ^0.8.28
- **Development Framework**: Hardhat
- **Testing**: Hardhat + Chai
- **Frontend**: React + TypeScript + ethers.js
- **Contract Libraries**: OpenZeppelin v5.3.0

### Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run coverage

# Test on Moonbeam fork
TEST_ON_MOONBEAM=true npx hardhat test
```

### Project Structure

```
CoverMax-DeFi/
├── contracts/          # Solidity smart contracts
│   ├── adapters/      # Lending protocol adapters
│   ├── interfaces/    # Contract interfaces
│   ├── libraries/     # Utility libraries
│   └── mocks/         # Test mock contracts
├── frontend/          # React frontend application
├── scripts/           # Deployment scripts
├── test/             # Test suite
└── hardhat.config.ts # Hardhat configuration
```

## Security Considerations

- All external calls use try-catch for failure isolation
- Time periods are immutable once set
- Adapters can fail independently without affecting the protocol
- Waterfall structure ensures fair loss distribution

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

Business Source License - see [LICENSE](LICENSE)

## Links

- [Protocol Documentation](PROTOCOL.md)
- [Frontend App](http://localhost:3000) (when running locally)
