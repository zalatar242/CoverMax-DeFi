# CoverMax DeFi Protocol Documentation

## Protocol Overview

CoverMax DeFi is a decentralized insurance protocol that implements a two-tranche risk allocation system for DeFi lending. The protocol allows users to deposit USDC and receive two different types of risk tranches, which are then deployed across multiple lending platforms. This innovative approach provides users with different risk-reward profiles while maximizing capital efficiency.

### Network Deployment

The protocol is currently deployed on **Polkadot Asset Hub (passetHub)** testnet:
- Chain ID: 420420422
- RPC URL: https://testnet-passet-hub-eth-rpc.polkadot.io/

## Core Components

### 1. InsuranceCore Contract

The main contract that orchestrates the entire protocol. It:

- Manages user deposits and tranche token issuance
- Coordinates with lending adapters
- Handles the investment and divestment processes
- Calculates and processes claims

**Deployed Address**: `0xBFBeD4E55F8d6fa19F0dd9986C7045eF45647dcd`

### 2. Tranche Tokens

Two ERC20 tokens representing different risk levels:

- **Tranche AAA (Senior)**: Lowest risk, first to be paid out
  - Address: `0x1c780207B0Ac77a93C10d9078C4F51Fcf94C7145`
- **Tranche AA (Junior)**: Higher risk, absorbs first losses
  - Address: `0xc4a1bb44c3BB4886019210993834971CfCe52DF2`

### 3. Lending Adapters

Modular components that integrate with various DeFi lending platforms:

- **Aave Adapter**: `0x9A96b128161cFc0C42f9e05cCd4dD2EAE54B6515`
- **Moonwell Adapter**: `0x820d093ABA5cEC9D7dd0096A77660287D96BB2B6`
- Extensible architecture to add more platforms

### 4. Supporting Contracts

- **InsuranceTimeManager**: `0xB960eC68282Ab2d9BfB5b93e00D046416BccDCc2`
  - Manages protocol time periods and transitions
- **InsuranceClaimManager**: `0x7C16d360f88e502DC241aCC7E705249Bcf6D6dC5`
  - Handles claim calculations and distributions
- **InsuranceAdapterManager**: Manages lending adapter registry
- **InsuranceCalculator**: Computes tranche payouts based on losses

## Risk Tranches Explained

### Structure

- When users deposit USDC, they receive equal amounts of AAA and AA tranches
- Each tranche represents a different risk level and priority in loss absorption
- Total deposit is split equally between the two tranches

### Risk Allocation

1. **Tranche AAA (Senior)**

   - First priority for repayment
   - Lowest risk profile
   - Suitable for conservative investors

2. **Tranche AA (Junior)**
   - Last priority for repayment
   - Higher risk profile
   - Absorbs first losses
   - Potential for higher returns

## Time Periods

The protocol operates on a fixed timeline with four key periods:

1. **Issuance Period (Start → S)**

   - Users can deposit USDC and receive tranche tokens
   - Lending adapters can be added or removed
   - Duration: 2 days

2. **Insurance Period (S → T1)**

   - Funds are invested across lending platforms
   - No new deposits accepted
   - Duration: 5 days

3. **Divestment Period (T1 → T2)**

   - Funds are withdrawn from lending platforms
   - Losses (if any) are calculated
   - Duration: 1 day

4. **Claim Period (T2 → T3)**
   - Users can redeem their tranche tokens for USDC
   - Payouts based on risk allocation
   - Duration: 1 day

## Integration with Lending Platforms

### Lending Adapter Interface

All lending adapters implement a standard interface with three main functions:

```solidity
function deposit(address asset, uint256 amount) external returns (uint256);
function withdraw(address asset, uint256 amount) external returns (uint256);
function getBalance(address asset) external view returns (uint256);
```

### Supported Platforms

1. **Aave**

   - Integration via AavePool and PoolDataProvider
   - Handles aToken mechanics
   - Supports supply and withdraw operations

2. **Moonwell**
   - Based on Compound v2 architecture
   - Handles mToken mechanics
   - Supports supply and withdraw operations

## Technical Implementation

### Smart Contract Architecture

The protocol uses a modular architecture with the following key contracts:
- **InsuranceCore.sol**: Main protocol logic and user interactions
- **InsuranceTimeManager.sol**: Time period management
- **InsuranceClaimManager.sol**: Claim processing and calculations
- **InsuranceAdapterManager.sol**: Lending adapter registry
- **InsuranceCalculator.sol**: Mathematical calculations for payouts
- **Tranche.sol**: ERC20 implementation for risk tranches

### Deposit Process

1. User approves USDC spending
2. User calls `splitRisk(amount)`
3. Equal amounts of AAA and AA tokens are minted
4. USDC is held until investment period

### Investment Process

1. Protocol calls `invest()`
2. USDC is distributed equally across lending adapters
3. Each adapter deposits into its respective platform
4. Failed deposits are logged and skipped

### Divestment Process

1. Protocol calls `divest()`
2. Funds are withdrawn from all platforms
3. Total recovered amount is calculated
4. Tranche payouts are computed based on losses

### Claims Process

1. User calls `claim()` or `claimAll()`
2. Tranche tokens are burned
3. USDC is paid out based on tranche priority
4. Claims are processed in waterfall structure

## Loss Absorption Mechanism

### No Loss Scenario

- All tranches receive 100% of their initial deposit
- Equal distribution across AAA and AA

### Partial Loss Scenarios

1. **Minor Loss**

   - Tranche AAA: 100% recovery
   - Tranche AA: Partial recovery

2. **Severe Loss**
   - Tranche AAA: Partial recovery
   - Tranche AA: No recovery

## User Flow

1. **Deposit**

   - User deposits USDC during issuance period
   - Receives equal amounts of AAA and AA tranches
   - Can trade tranches if desired

2. **Wait Period**

   - Funds are invested in lending platforms
   - Insurance coverage is active
   - No user action required

3. **Claim**
   - After divestment period
   - Redeem tranches for USDC
   - Payout based on tranche type and losses

## Security Considerations

1. **Smart Contract Security**

   - Immutable time periods
   - Ownership controls
   - Try-catch for external calls
   - Approval resets before new approvals

2. **Risk Management**

   - Diversification across platforms
   - Waterfall loss absorption
   - Failed adapter isolation

3. **User Protection**
   - Clear time periods
   - Transparent loss allocation
   - Equal initial distribution

## Protocol Parameters

- **RAY**: 1e27 (Used for floating point math)
- **TRANCHE_ALLOCATION**: RAY/2 (Equal allocation per tranche)
- **Decimals**: 6 (Matches USDC decimals)
- **Minimum Deposit**: 2 USDC (Must be divisible by 2)
- **Time Periods**: Fixed durations (7/28/1/3 days)

## Additional Infrastructure

### Uniswap V2 Integration

The protocol includes a full Uniswap V2 deployment for liquidity provision:
- **UniswapV2Factory**: `0xEF76a5cd6AE0B6fc1cCA68df3398De44AC4c73Ba`
- **UniswapV2Router02**: `0xCca3E8C9Cb2AE9DcD74C29f53804A1217fB6FBfe`
- **WETH**: Wrapped ETH implementation for pair creation

Liquidity pairs for tranches (not yet deployed):
- **AAA/USDC Pair**: Pending deployment
- **AA/USDC Pair**: Pending deployment

### Token Addresses

- **USDC (Mock)**: `0xD17Aef210dEC93D3521950E18aB8783e4e488Fd4`
  - Standard ERC20 with 6 decimals
  - Used as the base asset for the protocol

## Development and Testing

### Technology Stack
- **Smart Contracts**: Solidity ^0.8.28
- **Framework**: Hardhat with TypeScript
- **Testing**: Hardhat with Chai matchers
- **Coverage**: Solidity-coverage for test coverage analysis
- **Dependencies**: OpenZeppelin Contracts v5.3.0

### Testing on Moonbeam
The protocol includes special test configurations for Moonbeam network:
```bash
TEST_ON_MOONBEAM=true npx hardhat test
```

## Planned Features

1. **Self-Restarting Cycles**
   - Protocol will automatically restart in 1-week cycles
   - Enables continuous operation without manual intervention

2. **Flexible Withdrawals**
   - Users will be able to withdraw at any point
   - Rewards will be calculated and distributed appropriately based on time in protocol

3. **Liquidity Provision**
   - Deploy AAA/USDC and AA/USDC pairs on Uniswap V2
   - Enable secondary market trading of risk tranches

This documentation provides a comprehensive overview of the CoverMax DeFi protocol, its components, mechanisms, and implementation details. For specific implementation details, refer to the smart contract code and comments.
