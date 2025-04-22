# CoverMax Earnings Tracking Approaches

## Current Implementation Challenges

The current implementation calculates earnings based on APY and elapsed time using React state, which resets on page refresh. There is no persistence mechanism to track actual earnings across sessions.

## Proposed Solutions

### 1. Smart Contract Enhancement

A fully decentralized approach that extends the current Insurance contract.

**Implementation Details:**
- Add user earnings mapping in Insurance contract
- Track accumulated interest per user
- Update earnings calculations on deposits/withdrawals
- Store historical earnings data on-chain

**Pros:**
- Fully decentralized
- Trustless and transparent
- Direct integration with existing contract
- Accurate real-time tracking

**Cons:**
- Higher gas costs for users
- Requires contract upgrade
- Limited historical data storage due to gas constraints

### 2. Off-chain Storage Solution

A centralized approach using traditional backend infrastructure.

**Implementation Details:**
- Implement REST API for earnings data
- Set up database to store earnings history
- Create backend service to:
  - Monitor blockchain events
  - Calculate and store earnings per wallet
  - Track historical earnings data
- Update frontend to fetch from API

**Pros:**
- Flexible and extensible
- Detailed historical data storage
- Lower gas costs
- Easier to update and maintain

**Cons:**
- Introduces centralization
- Requires additional infrastructure
- Potential single point of failure
- Requires trust in backend calculations

### 3. Hybrid Approach

A balanced solution combining on-chain and off-chain components.

**Implementation Details:**
- Store milestone snapshots on-chain
  - Record total earnings at key points (deposits, withdrawals)
  - Store checksum of off-chain data
- Implement off-chain indexer
  - Monitor contract events
  - Calculate continuous earnings
  - Store detailed history
- Sync mechanism between on-chain and off-chain data

**Pros:**
- Balance of decentralization and efficiency
- Verifiable off-chain data
- Detailed historical tracking
- Moderate gas costs

**Cons:**
- More complex architecture
- Requires both blockchain and traditional infrastructure
- Need for careful sync management
- Partial centralization

## Next Steps

1. Select preferred approach based on:
   - Decentralization requirements
   - Gas cost constraints
   - Infrastructure capabilities
   - Development timeline

2. Create detailed technical specification for chosen approach

3. Implementation phases:
   - Prototype development
   - Testing strategy
   - Migration plan for existing users
   - Deployment and monitoring plan
