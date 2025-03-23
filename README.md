# Decentralized Insurance with Lending Integration

## Lending Adapters

The project includes lending adapters for Aave V3, Compound III, and Moonwell protocols on Base mainnet. These adapters allow for seamless integration with lending protocols to generate yield on deposited assets.

### Deployed Addresses (Base Mainnet)

- Aave V3 Pool: `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`
- Moonwell mUSDC: `0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22`
- Compound III USDC Market: `0xb125E6687d4313864e53df431d5425969c15Eb2F`

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Configure environment:
   - Copy `.env.example` to `.env`
   - Fill in required values

### Testing

The project includes two types of tests:

#### Unit Tests

Run the standard unit tests with mock contracts:

```bash
npx hardhat test test/*.test.ts
```

These tests use mock contracts to verify the core functionality of the adapters without requiring network access.

#### Mainnet Fork Tests

Test against a fork of the Base mainnet to ensure integration with real protocol states:

1. Configure your `.env` file:

```
# RPC URLs (Required)
BASE_MAINNET_RPC_URL=your_mainnet_rpc_url
BASE_SEPOLIA_RPC_URL=your_testnet_rpc_url

# Network Selection
NETWORK=mainnet  # Options: mainnet, sepolia

# Test Accounts (Required for tests)
MAINNET_USDC_WHALE=your_mainnet_whale_address
TESTNET_USDC_WHALE=your_testnet_whale_address

# Test Configuration
FORK_ENABLED=true
GAS_REPORT=true
TEST_TIMEOUT=120000

# API Keys
BASESCAN_API_KEY=your_basescan_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
```

2. Run the mainnet fork tests:

```bash
npx hardhat test test/*.mainnet.test.ts
```

The fork tests interact with actual protocol contracts to verify integration with:

- Real token implementations
- Protocol-specific behaviors
- Current mainnet state

### Deployment

To deploy the lending adapters to Base mainnet:

```bash
npx hardhat run scripts/deploy-adapters.ts --network base
```

This will:

1. Deploy all lending adapters
2. Verify the contracts on Basescan
3. Output the deployed addresses

### Architecture

Each lending adapter implements the `ILendingAdapter` interface with three core functions:

```solidity
function deposit(address asset, uint256 amount) external returns (uint256);
function withdraw(address asset, uint256 amount) external returns (uint256);
function getBalance(address asset) external returns (uint256);
```

- `AaveLendingAdapter`: Integrates with Aave V3 on Base
- `CompoundLendingAdapter`: Integrates with Compound III (Comet) USDC market
- `MoonwellLendingAdapter`: Integrates with Moonwell's mUSDC market

Key features:

- Aave adapter supports multiple assets through Aave V3 pool
- Compound adapter is optimized for USDC using Compound III (Comet)
- Moonwell adapter integrates with their mUSDC market

Error Handling:

- Custom errors for specific failure cases
- Comprehensive try/catch blocks for external calls
- Detailed error messages for better debugging
- Events emitted for important state changes

### Security Considerations

1. All adapters are immutable (no admin functions)
2. Direct integration with protocol contracts (no proxies)
3. Simple deposit/withdraw functionality
4. No external dependencies beyond the core protocol contracts
5. Each adapter is thoroughly tested against mainnet state
6. Comprehensive test coverage including both unit tests and mainnet fork tests

### Architecture Diagram

```
┌──────────────────┐
│                  │
│  Insurance.sol   │
│                  │
└────────┬─────────┘
         │
         │ uses
         ▼
┌──────────────────┐    implements     ┌──────────────────┐
│                  │◄──────────────────│                  │
│ ILendingAdapter  │                   │AaveLendingAdapter│
│                  │                   │                  │
└──────────────────┘                   └──────────────────┘
         ▲
         │ implements                  ┌──────────────────┐
         ├─────────────────────────────│MoonwellAdapter   │
         │                             │                  │
         │                             └──────────────────┘
         │
         │                             ┌──────────────────┐
         │                             │                  │
         └─────────────────────────────│CompoundAdapter   │
                                       │                  │
                                       └──────────────────┘
```
