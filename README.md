# CoverMax 🛡️

A decentralized insurance protocol on Polkadot Asset Hub that transforms traditional DeFi lending through tranched risk allocation for maximum capital efficiency.

## 🎮 Quick Start for Testing

Want to try out CoverMax? Connect to our testnet deployment:

**Polkadot Asset Hub Testnet**

- Network Name: Polkadot Asset Hub Testnet
- RPC URL: `https://testnet-passet-hub-eth-rpc.polkadot.io/`
- Chain ID: `420420422`
- Currency Symbol: ETH

Get test tokens from our deployed contracts:

- **USDC**: `0xD17Aef210dEC93D3521950E18aB8783e4e488Fd4`
- **Main Contract**: `0xBFBeD4E55F8d6fa19F0dd9986C7045eF45647dcd`

This deployment lets you:

- Deposit USDC and receive dual-tier tranche tokens
- Experience the full protocol lifecycle
- Test claim mechanisms and risk allocation
- Explore tranche token trading (coming soon)

⚠️ **WARNING**: This is a testnet deployment for development purposes only. Never use it with real funds on mainnet.

## Overview

CoverMax is a revolutionary insurance protocol that maximizes capital efficiency through tranched risk allocation for DeFi lending. Users deposit USDC and receive dual-tier risk tokens (AAA and AA tranches) that represent different risk-reward profiles. The protocol automatically deploys capital across multiple lending platforms (Aave, Moonwell) while providing insurance coverage through a sophisticated waterfall structure.

## 🎥 Demo Video

_Coming soon - Watch CoverMax in action_

## 🧠 How It Works

### The Insurance Mechanism

1. **Deposit Phase (7 days)**: Users deposit USDC into insurance pools
2. **Token Issuance**: For each deposit, users receive equal amounts of:
   - **AAA Tranche Tokens** - Senior position, lower risk, priority claims
   - **AA Tranche Tokens** - Junior position, higher risk, subordinate claims
3. **Investment Phase (14 days)**: Funds are deployed across lending protocols
4. **Divestment Phase (1 day)**: Funds are withdrawn from lending protocols
5. **Claim Phase (3 days)**: Token holders can redeem tokens for underlying assets

### The Risk-Insurance Relationship

The core innovation is the tranched risk allocation system:

- **When you hold AAA tokens**: You have senior claim priority but lower yield potential
- **When you hold AA tokens**: You absorb first losses but earn higher yields
- **When you trade tokens**: You can adjust your risk profile dynamically

### Example Scenarios

#### Risk Rebalancing Strategy

1. **Alice deposits 1000 USDC** → receives 500 AAA + 500 AA tokens
2. **Bob deposits 1000 USDC** → receives 500 AAA + 500 AA tokens
3. **Bob wants more downside protection**, so he trades on secondary markets:
   - Sells 200 AA tokens → buys 190 AAA tokens (accepts 10 token discount for safety)
4. **Bob now holds 690 AAA + 300 AA tokens** (990 total)
   - Result: Bob sacrificed 10 tokens of potential upside for senior claim priority
5. **Alice sees opportunity in discounted AA tokens**:
   - Buys 200 AA tokens → now holds 500 AAA + 700 AA tokens (1200 total)
6. **If lending protocols suffer losses**:
   - Bob's 690 AAA tokens get paid before any AA tokens
   - Alice's AA tokens absorb losses but have higher yield potential
7. **If no losses occur**:
   - Alice benefits from her larger token position and higher yields

## 🏗️ Protocol Architecture

### Core Contracts

- **[`InsuranceCore.sol`](contracts/InsuranceCore.sol)**: Main protocol contract managing deposits, investments, and claims
- **[`InsuranceTimeManager.sol`](contracts/InsuranceTimeManager.sol)**: Automated lifecycle management with time-based phases
- **[`InsuranceClaimManager.sol`](contracts/InsuranceClaimManager.sol)**: Claim processing and waterfall calculations
- **[`InsuranceCalculator.sol`](contracts/InsuranceCalculator.sol)**: Mathematical calculations for tranche distributions
- **[`InsuranceAdapterManager.sol`](contracts/InsuranceAdapterManager.sol)**: Registry and management of lending adapters

### Supported Assets

- **USDC**: Primary base asset (6 decimals)
- **Integration with**:
  - Aave interest-bearing tokens
  - Moonwell lending protocol
  - Extensible to other yield-bearing assets

### Risk Token Tiers

| Token Type  | Risk Level | Claim Priority | Use Case                   |
| ----------- | ---------- | -------------- | -------------------------- |
| AAA-Tranche | Lower      | First claims   | Conservative yield seekers |
| AA-Tranche  | Higher     | Subordinate    | Risk-seeking yield farmers |

## 🔄 Protocol Lifecycle

### Phase 1: Issuance Period (7 days)

- Users deposit USDC into the protocol
- Equal amounts of AAA and AA tranche tokens are minted
- Tokens can be traded on secondary markets
- Lending adapters can be configured

### Phase 2: Insurance Period (14 days)

- Funds are deployed across lending protocols via adapters
- Active insurance coverage for deposited assets
- Yield generation from lending protocols
- Tranche tokens continue trading on secondary markets

### Phase 3: Divestment Period (1 day)

- Funds are withdrawn from all lending protocols
- Losses (if any) are calculated and recorded
- Total recovered amount determines payout ratios

### Phase 4: Claim Period (3 days)

- All token holders can redeem their tokens
- AAA tokens have priority claims on recovered assets
- AA tokens absorb first losses but receive remaining funds
- Protocol cycle completes and can restart

## 💰 Economic Model

### For Conservative Investors (AAA Holders)

- Deposit USDC to receive senior tranche tokens
- Lower risk exposure with priority claims
- Steady returns from lending yield
- Protection against first-loss scenarios

### For Risk Seekers (AA Holders)

- Higher yield potential from subordinate position
- Absorb first losses but benefit from higher returns
- Opportunity to accumulate discounted tokens
- Higher risk-reward profile

### For Yield Optimizers

- Deposit once, receive both risk levels
- Rebalance between AAA/AA based on market conditions
- Arbitrage opportunities between tranches
- Maximize capital efficiency across risk spectrum

## 🦄 Uniswap Integration

### Why Uniswap?

Tranche tokens are standard ERC20 tokens that can be traded on any DEX. Our Uniswap V2 integration provides:

- **Liquidity**: Deep markets for tranche token trading
- **Price Discovery**: Market-driven risk pricing
- **Accessibility**: Anyone can buy/sell insurance risk
- **Composability**: Tranche tokens can be used in other DeFi protocols

### Trading Strategy Examples

#### 1. Risk Tier Rebalancing (AAA ↔ AA Pool)

```solidity
// Strategy: Increase downside protection by converting AA to AAA tokens
// Bob wants more safety, less upside exposure
uniswapRouter.swapExactTokensForTokens(
    200 * 1e6, // Sell 200 AA tokens
    190 * 1e6, // Expect ~190 AAA tokens (accept discount for safety)
    [aaToken, aaaToken],
    msg.sender,
    deadline
);

// Result: Bob now has more AAA tokens (priority claims)
// but fewer AA tokens (subordinate claims)
```

#### 2. Complete Risk Exit (Tranche Token → USDC)

```solidity
// Strategy: Exit insurance position entirely
// Sell tranche tokens for USDC to eliminate exposure
uniswapRouter.swapExactTokensForTokens(
    500 * 1e6, // Sell 500 AAA tokens
    minUSDCOut,
    [aaaToken, USDC],
    msg.sender,
    deadline
);
```

#### 3. Risk Speculation (USDC → Tranche Token)

```solidity
// Strategy: Buy underpriced risk for potential yield
// Charlie thinks lending losses are unlikely
uniswapRouter.swapExactTokensForTokens(
    1000 * 1e6, // Spend 1000 USDC
    minTokensOut,
    [USDC, aaToken],
    msg.sender,
    deadline
);
```

## 🔧 Technical Implementation

### Smart Contract Features

- **Modular Architecture**: Separate contracts for time, claims, adapters, and calculations
- **Waterfall Loss Distribution**: Fair and transparent loss allocation
- **Automated Lifecycle**: Time-based phase transitions
- **Lending Integration**: Pluggable adapters for multiple protocols
- **Emergency Controls**: Owner can manage adapters and parameters

### Security Considerations

- **Audited Components**: Built on OpenZeppelin v5.3.0 contracts
- **Isolation**: Failed adapters don't affect protocol operation
- **Precision Math**: 6-decimal precision matching USDC
- **Access Controls**: Role-based permissions for administrative functions
- **Try-Catch**: All external calls protected against failures

## 📊 Key Metrics

### Protocol Health

- **Total Value Locked (TVL)**: Combined value of all deposited USDC
- **Insurance Coverage**: Active coverage across lending protocols
- **Tranche Distribution**: Risk allocation across token holders
- **Adapter Performance**: Success rates of lending integrations

### Market Dynamics

- **Tranche Token Prices**: Market valuation of different risk levels
- **Liquidity Depth**: Available trading volume on DEXes
- **Yield Differential**: Return differences between AAA and AA tranches
- **Loss Absorption**: Historical performance of waterfall structure

## 🚀 Getting Started

### For Users

#### Connect to Testnet

Add Polkadot Asset Hub Testnet to MetaMask:

- **Network Name**: Polkadot Asset Hub Testnet
- **RPC URL**: `https://testnet-passet-hub-eth-rpc.polkadot.io/`
- **Chain ID**: `420420422`
- **Currency Symbol**: ETH

#### Basic Operations

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

### For Developers

#### Installation

```bash
# Install dependencies
npm install --legacy-peer-deps

# Compile contracts
npm run compile

# Run tests
npm test

# Run with coverage
npm run coverage
```

#### Testing

The protocol includes comprehensive test coverage:

- **Core Protocol Tests**: All main contracts and functions
- **Integration Tests**: Lending adapter interactions
- **Uniswap Tests**: DEX infrastructure and trading
- **Edge Cases**: Error conditions and boundary scenarios
- **Time Management**: Phase transitions and lifecycle

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --grep "Uniswap"
npm test -- --grep "Insurance"

# Test on Moonbeam fork
TEST_ON_MOONBEAM=true npx hardhat test
```

#### Deployment

```bash
# Deploy to testnet
npm run deploy

# Deploy to local network
npx hardhat ignition deploy ignition/modules/Insurance.ts --network localhost
```

## 🌐 Live Deployment

### Polkadot Asset Hub Testnet

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

### Frontend Application

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

The frontend will be available at http://localhost:3000

## 🔮 Roadmap

### Phase 1: Core Protocol ✅

- ✅ Tranched risk allocation system
- ✅ Lending adapter integration (Aave, Moonwell)
- ✅ Automated lifecycle management
- ✅ Waterfall loss distribution

### Phase 2: Trading Infrastructure 🚧

- ✅ Uniswap V2 factory and router deployment
- 🔧 Tranche token liquidity pools
- 🔧 Advanced trading strategies
- 🔧 Price discovery mechanisms

### Phase 3: Advanced Features 🎯

- 🎯 Self-restarting cycles
- 🎯 Flexible withdrawal mechanisms
- 🎯 Dynamic risk rebalancing
- 🎯 Cross-chain expansion

### Phase 4: Ecosystem Growth 📈

- 📈 Additional lending protocol integrations
- 📈 Institutional-grade features
- 📈 Governance token launch
- 📈 Mainnet deployment

## 🤝 Contributing

Contributions are welcome! This project includes:

- **Hardhat Development Environment**: Full TypeScript support
- **Comprehensive Test Suite**: Over 95% code coverage
- **Modular Architecture**: Easy to extend and modify
- **Documentation**: Detailed protocol and API docs

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Technology Stack

- **Smart Contracts**: Solidity ^0.8.28
- **Development Framework**: Hardhat with TypeScript
- **Testing**: Hardhat + Chai matchers
- **Frontend**: React + TypeScript + ethers.js
- **Libraries**: OpenZeppelin v5.3.0

## 📜 License

Business Source License - see [LICENSE](LICENSE)

## 📚 Resources

- **[Protocol Documentation](PROTOCOL.md)**: Detailed technical specifications
- **[Frontend Application](http://localhost:3000)**: User interface (local development)
- **[Contract Addresses](config/addresses.ts)**: Deployment addresses
- **[Test Suite](test/)**: Comprehensive test coverage

---

**CoverMax**: Maximizing capital efficiency through tranched risk allocation 🛡️
