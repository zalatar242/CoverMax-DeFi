# CoverMax DeFi Protocol Documentation

## Protocol Overview

CoverMax DeFi is a decentralized insurance protocol that implements a three-tranche risk allocation system for DeFi lending. The protocol allows users to deposit USDC and receive three different types of risk tranches, which are then deployed across multiple lending platforms. This innovative approach provides users with different risk-reward profiles while maximizing capital efficiency.

## Core Components

### 1. Insurance Contract

The main contract that orchestrates the entire protocol. It:

- Manages user deposits and tranche token issuance
- Coordinates with lending adapters
- Handles the investment and divestment processes
- Calculates and processes claims

### 2. Tranche Tokens

Three ERC20 tokens (A, B, C) representing different risk levels:

- **Tranche A (Senior)**: Lowest risk, first to be paid out
- **Tranche B (Mezzanine)**: Medium risk, second in line for payouts
- **Tranche C (Junior)**: Highest risk, last to be paid out

### 3. Lending Adapters

Modular components that integrate with various DeFi lending platforms:

- Aave Adapter
- Compound Adapter
- Moonwell Adapter
- Extensible to add more platforms

## Risk Tranches Explained

### Structure

- When users deposit USDC, they receive equal amounts of A, B, and C tranches
- Each tranche represents a different risk level and priority in loss absorption
- Total deposit is split equally among the three tranches

### Risk Allocation

1. **Tranche A (Senior)**

   - First priority for repayment
   - Lowest risk profile
   - Suitable for conservative investors

2. **Tranche B (Mezzanine)**

   - Second priority for repayment
   - Medium risk profile
   - Balanced risk-reward ratio

3. **Tranche C (Junior)**
   - Last priority for repayment
   - Highest risk profile
   - Absorbs first losses
   - Potential for highest returns

## Time Periods

The protocol operates on a fixed timeline with four key periods:

1. **Issuance Period (Start → S)**

   - Users can deposit USDC and receive tranche tokens
   - Lending adapters can be added or removed
   - Duration: 7 days

2. **Insurance Period (S → T1)**

   - Funds are invested across lending platforms
   - No new deposits accepted
   - Duration: 28 days

3. **Divestment Period (T1 → T2)**

   - Funds are withdrawn from lending platforms
   - Losses (if any) are calculated
   - Duration: 1 day

4. **Claim Period (T2 → T3)**
   - Users can redeem their tranche tokens for USDC
   - Payouts based on risk allocation
   - Duration: 3 days

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

2. **Compound**

   - Integration with Comet (Compound v3)
   - Handles cToken mechanics
   - Supports supply and withdraw operations

3. **Moonwell**
   - Similar to Compound v2 architecture
   - Handles mToken mechanics
   - Supports supply and withdraw operations

## Technical Implementation

### Deposit Process

1. User approves USDC spending
2. User calls `splitRisk(amount)`
3. Equal amounts of A, B, C tokens are minted
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
- Equal distribution across A, B, and C

### Partial Loss Scenarios

1. **Minor Loss**

   - Tranche A: 100% recovery
   - Tranche B: 100% recovery
   - Tranche C: Partial recovery

2. **Moderate Loss**

   - Tranche A: 100% recovery
   - Tranche B: Partial recovery
   - Tranche C: No recovery

3. **Severe Loss**
   - Tranche A: Partial recovery
   - Tranche B: No recovery
   - Tranche C: No recovery

## User Flow

1. **Deposit**

   - User deposits USDC during issuance period
   - Receives equal amounts of A, B, C tranches
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
- **TRANCHE_ALLOCATION**: RAY/3 (Equal allocation per tranche)
- **Decimals**: 6 (Matches USDC decimals)
- **Minimum Deposit**: 3 USDC (Must be divisible by 3)
- **Time Periods**: Fixed durations (7/28/1/3 days)

This documentation provides a comprehensive overview of the CoverMax DeFi protocol, its components, mechanisms, and implementation details. For specific implementation details, refer to the smart contract code and comments.
