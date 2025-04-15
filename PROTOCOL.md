# CoverMax DeFi Protocol Documentation

## Protocol Overview

CoverMax DeFi is a decentralized insurance protocol that implements a two-tranche risk allocation system for DeFi lending. The protocol allows users to deposit USDC and receive two different types of risk tranches, which are then deployed across multiple lending platforms. This innovative approach provides users with different risk-reward profiles while maximizing capital efficiency.

## Core Components

### 1. Insurance Contract

The main contract that orchestrates the entire protocol. It:

- Manages user deposits and tranche token issuance
- Coordinates with lending adapters
- Handles the investment and divestment processes
- Calculates and processes claims

### 2. Tranche Tokens

Two ERC20 tokens representing different risk levels:

- **Tranche AAA (Senior)**: Lowest risk, first to be paid out
- **Tranche AA (Junior)**: Higher risk, absorbs first losses

### 3. Lending Adapters

Modular components that integrate with various DeFi lending platforms:

- Aave Adapter
- Moonwell Adapter
- Extensible to add more platforms

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

## Planned Features

1. **Self-Restarting Cycles**
   - Protocol will automatically restart in 1-week cycles
   - Enables continuous operation without manual intervention

2. **Flexible Withdrawals**
   - Users will be able to withdraw at any point
   - Rewards will be calculated and distributed appropriately based on time in protocol

This documentation provides a comprehensive overview of the CoverMax DeFi protocol, its components, mechanisms, and implementation details. For specific implementation details, refer to the smart contract code and comments.
